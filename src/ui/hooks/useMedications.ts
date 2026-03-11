import { useState, useEffect, useCallback } from 'react';
import type { Medication, MedicationInsert, MedicationUpdate, MedicationWithInsight, DoseLogInsert, DoseLog } from '../../domain/types';
import { medicationService } from '../../data/services/medicationService';
import { offlineCache } from '../../data/utils/offlineCache';
import { medicationEvents } from '../../data/utils/medicationEvents';
import { getDoseTimes } from '../../domain/utils/medicationUtils';
import {
  logMedicationAdded,
  logMedicationUpdated,
  logMedicationDeleted,
  logMedicationAction,
  logRefill,
  logDoseLogged,
  logDoseBatch,
  logDoseReverted,
} from '../../data/utils/notificationDebugLog';

const CACHE_KEY = 'medications';

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await medicationService.getAll();
      setMedications(data);
      setError(null);
      offlineCache.set(CACHE_KEY, data);
    } catch (err) {
      // Try loading from cache on network failure
      const cached = await offlineCache.get<Medication[]>(CACHE_KEY);
      if (cached) {
        setMedications(cached);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch medications');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // Listen for all_data_deleted event to clear in-memory state
  useEffect(() => {
    return medicationEvents.on('all_data_deleted', () => {
      setMedications([]);
      offlineCache.set(CACHE_KEY, []);
    });
  }, []);

  // Re-fetch when medication lifecycle events fire from OTHER hook instances
  // (e.g., NotificationBridge needs to pick up meds created in CabinetScreen)
  useEffect(() => {
    const events = [
      'medication_created',
      'medication_deleted',
      'medication_paused',
      'medication_resumed',
      'medication_archived',
      'medication_restored',
      'medication_updated',
    ] as const;

    const unsubs = events.map((event) =>
      medicationEvents.on(event, () => {
        console.log('[NOTIF-DEBUG][useMedications] Re-fetching due to event:', event);
        fetchMedications();
      }),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [fetchMedications]);

  const activeMedications = medications.filter((m) => !m.is_archived);
  const archivedMedications = medications.filter((m) => m.is_archived);

  const createMedication = async (data: MedicationInsert): Promise<MedicationWithInsight> => {
    const response = await medicationService.create(data);
    // R-02: Strip insight before storing in medications state to prevent
    // extra field from leaking into future API calls. offlineCache is NOT
    // updated here — fetchMedications() triggered by medication_created event
    // refreshes from the clean GET response.
    const { insight, ...medicationOnly } = response;
    setMedications((prev) => [medicationOnly as Medication, ...prev]);
    medicationEvents.emit('medication_created', response.id);
    logMedicationAdded(response.name, getDoseTimes(response), insight?.xp_awarded);
    return response;
  };

  const updateMedication = async (id: string, data: MedicationUpdate) => {
    const med = await medicationService.update(id, data);
    setMedications((prev) => prev.map((m) => (m.id === id ? med : m)));
    medicationEvents.emit('medication_updated', id);
    logMedicationUpdated(med.name);
    return med;
  };

  const deleteMedication = async (id: string) => {
    const med = medications.find((m) => m.id === id);
    await medicationService.remove(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
    medicationEvents.emit('medication_deleted', id);
    logMedicationDeleted(med?.name ?? id);
  };

  const pauseMedication = async (id: string) => {
    const med = await medicationService.pause(id);
    setMedications((prev) => prev.map((m) => (m.id === id ? med : m)));
    medicationEvents.emit('medication_paused', id);
    logMedicationAction('Paused', med.name);
    return med;
  };

  const resumeMedication = async (id: string) => {
    const med = await medicationService.resume(id);
    setMedications((prev) => prev.map((m) => (m.id === id ? med : m)));
    medicationEvents.emit('medication_resumed', id);
    logMedicationAction('Resumed', med.name);
    return med;
  };

  const archiveMedication = async (id: string) => {
    const med = await medicationService.archive(id);
    setMedications((prev) => prev.map((m) => (m.id === id ? med : m)));
    medicationEvents.emit('medication_archived', id);
    logMedicationAction('Archived', med.name);
    return med;
  };

  const restoreMedication = async (id: string) => {
    const med = await medicationService.restore(id);
    setMedications((prev) => prev.map((m) => (m.id === id ? med : m)));
    medicationEvents.emit('medication_restored', id);
    logMedicationAction('Restored', med.name);
    return med;
  };

  const refillMedication = async (id: string, quantity: number) => {
    const med = medications.find((m) => m.id === id);
    const refill = await medicationService.refill(id, quantity);
    logRefill(med?.name ?? id, quantity, refill.new_stock ?? 0);
    await fetchMedications();
    return refill;
  };

  const logDose = async (medicationId: string, data: DoseLogInsert) => {
    const med = medications.find((m) => m.id === medicationId);
    const dose = await medicationService.logDose(medicationId, data);
    logDoseLogged(med?.name ?? medicationId, data.status ?? 'taken', data.scheduled_at);
    await fetchMedications(); // Refresh to get updated stock
    return dose;
  };

  const logDoseBatchFn = async (
    doses: Array<{ medicationId: string; data: DoseLogInsert }>
  ): Promise<{ success: DoseLog[]; failed: string[] }> => {
    const result = await medicationService.logDoseBatch(doses);
    logDoseBatch(doses.length, result.success.length, result.failed.length);
    await fetchMedications(); // Refresh to get updated stock
    return result;
  };

  /**
   * Revert (undo) a dose that was marked as taken.
   * Must be within 30-minute window from when dose was taken.
   * Restores stock if it was decremented.
   */
  const revertDose = async (
    medicationId: string,
    doseId: string,
    doseSize: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const med = medications.find((m) => m.id === medicationId);
      await medicationService.revertDose(medicationId, doseId);
      // Optimistic local stock update (backend already restored stock)
      setMedications((prev) =>
        prev.map((m) =>
          m.id === medicationId
            ? { ...m, current_stock: m.current_stock + (doseSize || 1) }
            : m
        )
      );
      medicationEvents.emit('dose_reverted', medicationId);
      logDoseReverted(med?.name ?? medicationId);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Map backend error messages to user-friendly messages
      if (message.includes('expired') || message.includes('30')) {
        return { success: false, error: 'Undo window expired (30 minutes)' };
      }
      if (message.includes('not marked as taken') || message.includes('not found')) {
        return { success: false, error: 'This dose cannot be reverted' };
      }
      return { success: false, error: 'Unable to undo dose. Please try again.' };
    }
  };

  return {
    medications,
    activeMedications,
    archivedMedications,
    loading,
    error,
    fetchMedications,
    createMedication,
    updateMedication,
    deleteMedication,
    pauseMedication,
    resumeMedication,
    archiveMedication,
    restoreMedication,
    refillMedication,
    logDose,
    logDoseBatch: logDoseBatchFn,
    revertDose,
  };
}
