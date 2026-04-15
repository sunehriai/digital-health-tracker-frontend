import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { setMedicationCache } from '../utils/notifications';
import type {
  Medication,
  MedicationInsert,
  MedicationUpdate,
  MedicationWithInsight,
  DoseLog,
  DoseLogInsert,
  RefillLog,
  RefillActivity,
} from '../../domain/types';

export const medicationService = {
  async getAll(): Promise<Medication[]> {
    const medications = await apiClient.request<Medication[]>(ENDPOINTS.MEDICATIONS);
    setMedicationCache(medications).catch(() => {}); // Fire-and-forget cache write
    return medications;
  },

  async getById(id: string): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION(id));
  },

  async create(data: MedicationInsert): Promise<MedicationWithInsight> {
    return apiClient.request(ENDPOINTS.MEDICATIONS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: MedicationUpdate): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<void> {
    return apiClient.request(ENDPOINTS.MEDICATION(id), { method: 'DELETE' });
  },

  async pause(id: string): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION_PAUSE(id), { method: 'POST' });
  },

  async resume(id: string): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION_RESUME(id), { method: 'POST' });
  },

  async archive(id: string): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION_ARCHIVE(id), { method: 'POST' });
  },

  async restore(id: string): Promise<Medication> {
    return apiClient.request(ENDPOINTS.MEDICATION_RESTORE(id), { method: 'POST' });
  },

  async refill(id: string, quantityAdded: number): Promise<RefillLog> {
    return apiClient.request(ENDPOINTS.MEDICATION_REFILL(id), {
      method: 'POST',
      body: JSON.stringify({ quantity_added: quantityAdded }),
    });
  },

  async getDoses(medicationId: string): Promise<DoseLog[]> {
    return apiClient.request(ENDPOINTS.MEDICATION_DOSES(medicationId));
  },

  async logDose(medicationId: string, data: DoseLogInsert): Promise<DoseLog> {
    return apiClient.request(ENDPOINTS.MEDICATION_DOSES(medicationId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logDoseBatch(
    doses: Array<{ medicationId: string; data: DoseLogInsert }>
  ): Promise<{ success: DoseLog[]; failed: string[] }> {
    const results = await Promise.allSettled(
      doses.map(({ medicationId, data }) =>
        this.logDose(medicationId, data).then((log) => ({ medicationId, log }))
      )
    );

    const success: DoseLog[] = [];
    const failed: string[] = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        success.push(result.value.log);
      } else {
        failed.push(doses[idx].medicationId);
      }
    });

    return { success, failed };
  },

  /**
   * Revert (undo) a logged dose.
   * Restores medication stock if it was decremented.
   * Must be within 30 minutes of marking dose as taken.
   */
  async revertDose(medicationId: string, doseId: string): Promise<void> {
    await apiClient.request(ENDPOINTS.MEDICATION_DOSE_REVERT(medicationId, doseId), {
      method: 'DELETE',
    });
  },

  async getRefillActivity(): Promise<RefillActivity> {
    return apiClient.request(ENDPOINTS.REFILL_ACTIVITY);
  },
};
