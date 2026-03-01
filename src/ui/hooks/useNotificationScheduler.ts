import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { rescheduleAll, registerNotificationActionHandler } from '../../data/utils/notifications';
import { medicationEvents } from '../../data/utils/medicationEvents';
import type { Medication, NotificationPreferences } from '../../domain/types';

const DEBOUNCE_MS = 1500;

/**
 * Hook that wires AppState changes and medication lifecycle events
 * to rescheduleAll(). Mount once in App.tsx or a top-level component.
 *
 * Issue 17: Accepts medications and prefs as props to avoid
 * creating duplicate hook instances (useNotificationPrefs, useMedications).
 */
export function useNotificationScheduler(
  medications: Medication[],
  prefs: NotificationPreferences | null,
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medicationsRef = useRef<Medication[]>(medications);
  const prefsRef = useRef<NotificationPreferences | null>(prefs);

  // Keep refs in sync
  useEffect(() => {
    medicationsRef.current = medications;
  }, [medications]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const debouncedReschedule = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const currentPrefs = prefsRef.current;
      const currentMeds = medicationsRef.current;
      if (!currentPrefs || currentMeds.length === 0) return;
      try {
        await rescheduleAll(currentMeds, currentPrefs);
      } catch {
        // Non-critical
      }
    }, DEBOUNCE_MS);
  }, []);

  // AppState listener: reschedule on foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        debouncedReschedule();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [debouncedReschedule]);

  // Medication lifecycle events → reschedule
  useEffect(() => {
    const events = [
      'medication_paused',
      'medication_resumed',
      'medication_deleted',
      'medication_archived',
      'medication_restored',
      'medication_updated',
    ] as const;

    const unsubs = events.map((event) =>
      medicationEvents.on(event, () => debouncedReschedule()),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [debouncedReschedule]);

  // Issue 6: Register notification action handler with getter functions
  // so prefs and medications are read at call time, not registration time.
  useEffect(() => {
    const sub = registerNotificationActionHandler(
      () => prefsRef.current,
      () => medicationsRef.current,
    );
    return () => sub.remove();
  }, []);

  // Initial reschedule on mount (when data is ready)
  useEffect(() => {
    if (prefs && medications.length > 0) {
      rescheduleAll(medications, prefs).catch(() => {});
    }
  }, [prefs?.dose_reminders_enabled]);
}
