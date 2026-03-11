import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { rescheduleAll, registerNotificationActionHandler } from '../../data/utils/notifications';
import { medicationEvents } from '../../data/utils/medicationEvents';
import { registerToken } from '../../data/services/pushService';
import type { Medication, NotificationPreferences } from '../../domain/types';
// Activity log calls are in notifications.ts (rescheduleAll) — no direct calls needed here

const DEBOUNCE_MS = 1500;

// Debug logging
function nlog(...args: unknown[]) {
  console.log('[NOTIF-DEBUG][Scheduler]', ...args);
}

/**
 * Hook that wires AppState changes and medication lifecycle events
 * to rescheduleAll(). Mount once in App.tsx or a top-level component.
 *
 * Issue 17: Accepts medications and prefs as props to avoid
 * creating duplicate hook instances (useNotificationPrefs, useMedications).
 *
 * Phase 6: Also registers FCM push token with backend on mount.
 */
export function useNotificationScheduler(
  medications: Medication[],
  prefs: NotificationPreferences | null,
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medicationsRef = useRef<Medication[]>(medications);
  const prefsRef = useRef<NotificationPreferences | null>(prefs);
  const pushTokenRegistered = useRef(false);

  nlog('Hook rendered — meds:', medications.length, 'prefs:', prefs ? 'loaded' : 'null');


  // Keep refs in sync
  useEffect(() => {
    medicationsRef.current = medications;
    nlog('medicationsRef updated:', medications.length, 'meds');
  }, [medications]);

  useEffect(() => {
    prefsRef.current = prefs;
    nlog('prefsRef updated:', prefs ? `dose_reminders=${prefs.dose_reminders_enabled}, advance=${prefs.advance_reminder_minutes}` : 'null');
  }, [prefs]);

  const debouncedReschedule = useCallback((source: string = 'unknown') => {
    nlog('debouncedReschedule called from:', source);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const currentPrefs = prefsRef.current;
      const currentMeds = medicationsRef.current;
      nlog('Debounce fired (from:', source, ') — meds:', currentMeds.length, 'prefs:', currentPrefs ? 'loaded' : 'NULL');
      if (!currentPrefs) {
        nlog('ABORT: prefs is null');
        return;
      }
      if (currentMeds.length === 0) {
        nlog('ABORT: medications array is empty');
        return;
      }
      try {
        await rescheduleAll(currentMeds, currentPrefs);
      } catch (err) {
        nlog('rescheduleAll ERROR:', err);
      }
    }, DEBOUNCE_MS);
  }, []);

  // AppState listener: reschedule on foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      nlog('AppState changed to:', nextState);
      if (nextState === 'active') {
        debouncedReschedule('app_foreground');
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [debouncedReschedule]);

  // Medication lifecycle events → reschedule
  useEffect(() => {
    const events = [
      'medication_created',
      'medication_paused',
      'medication_resumed',
      'medication_deleted',
      'medication_archived',
      'medication_restored',
      'medication_updated',
    ] as const;

    const unsubs = events.map((event) =>
      medicationEvents.on(event, () => {
        nlog('Medication event:', event);
        debouncedReschedule(event);
      }),
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
  // BUG FIX: Also depend on medications.length so reschedule fires
  // when medications load after prefs are already cached.
  useEffect(() => {
    nlog('Initial reschedule effect — prefs:', prefs ? 'loaded' : 'null',
         'meds:', medications.length,
         'dose_reminders_enabled:', prefs?.dose_reminders_enabled);
    if (prefs && medications.length > 0) {
      nlog('Triggering initial rescheduleAll()');

      rescheduleAll(medications, prefs).catch((err) => {
        nlog('Initial rescheduleAll ERROR:', err);
      });
    } else {
      nlog('Initial reschedule SKIPPED: prefs=', !!prefs, 'meds.length=', medications.length);
    }
  }, [prefs?.dose_reminders_enabled, medications.length > 0]);

  // Phase 6: Register FCM push token once on mount (BP-017: no independent permission request)
  useEffect(() => {
    if (pushTokenRegistered.current) return;
    if (!prefs) return; // Wait until prefs loaded (implies user is authenticated)
    pushTokenRegistered.current = true;

    registerToken().catch((err) => {
      nlog('Push token registration failed (non-blocking):', err);
    });
  }, [prefs]);
}
