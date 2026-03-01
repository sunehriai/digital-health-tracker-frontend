import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationPreferencesService } from '../../data/services/notificationPreferencesService';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  MedicationNotificationOverride,
} from '../../domain/types';

const STORAGE_KEY = '@vision_notification_prefs';
const PENDING_SYNC_KEY = '@vision_notification_prefs_pending';
const DEBOUNCE_MS = 1500;

/** Issue 5: Timestamped pending sync payload to prevent stale overwrites. */
interface PendingSyncPayload {
  data: NotificationPreferencesUpdate;
  saved_at: string; // ISO timestamp
}

const DEFAULTS: Omit<NotificationPreferences, 'id' | 'user_id' | 'updated_at'> = {
  dose_reminders_enabled: true,
  advance_reminder_minutes: 0,
  snooze_enabled: true,
  snooze_duration_minutes: 10,
  refill_alerts_enabled: true,
  low_stock_threshold_days: 7,
  gamification_notifications_enabled: true,
  streak_milestones_enabled: true,
  tier_advancement_enabled: true,
  waiver_prompt_enabled: true,
  comeback_boost_enabled: true,
  system_notifications_enabled: true,
  medication_end_date_alerts: true,
  safety_alerts_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  critical_bypass_quiet: true,
  medication_overrides: {},
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pendingUpdate = useRef<NotificationPreferencesUpdate>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  // Load from cache on mount, then sync from backend
  useEffect(() => {
    isMounted.current = true;
    loadFromCache().then(() => syncFromBackend());
    return () => {
      isMounted.current = false;
      flushPendingUpdate();
    };
  }, []);

  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        setPrefs(JSON.parse(cached));
        setLoading(false);
      }
    } catch {
      // Cache miss is fine
    }
  };

  const syncFromBackend = async () => {
    try {
      // Issue 5: Check for pending sync with timestamp comparison
      const pendingRaw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (pendingRaw) {
        try {
          const pending: PendingSyncPayload = JSON.parse(pendingRaw);
          // Fetch server state first to compare timestamps
          const serverPrefs = await notificationPreferencesService.get();
          if (pending.saved_at > serverPrefs.updated_at) {
            // Pending is newer — apply it
            const updated = await notificationPreferencesService.update(pending.data);
            await AsyncStorage.removeItem(PENDING_SYNC_KEY);
            if (isMounted.current) {
              setPrefs(updated);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
          } else {
            // Server is newer — discard pending, use server state
            await AsyncStorage.removeItem(PENDING_SYNC_KEY);
            if (isMounted.current) {
              setPrefs(serverPrefs);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrefs));
            }
          }
          return;
        } catch {
          // Will retry on next foreground
        }
      }

      const serverPrefs = await notificationPreferencesService.get();
      if (isMounted.current) {
        setPrefs(serverPrefs);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrefs));
      }
    } catch {
      // Offline — use cache or defaults
      if (!prefs && isMounted.current) {
        setPrefs({
          id: '',
          user_id: '',
          updated_at: new Date().toISOString(),
          ...DEFAULTS,
        } as NotificationPreferences);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  /** Issue 13: Write-ahead to PENDING_SYNC_KEY before attempting network save. */
  const flushPendingUpdate = async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const data = pendingUpdate.current;
    if (Object.keys(data).length > 0) {
      pendingUpdate.current = {};
      // Write-ahead: persist pending data before attempting async save
      const payload: PendingSyncPayload = { data, saved_at: new Date().toISOString() };
      try {
        await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(payload));
      } catch {
        // Storage full — best-effort
      }
      saveToBackend(data);
    }
  };

  const saveToBackend = async (data: NotificationPreferencesUpdate) => {
    if (isMounted.current) setSyncing(true);
    try {
      const updated = await notificationPreferencesService.update(data);
      if (isMounted.current) {
        setPrefs(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    } catch {
      // Save locally for retry on next foreground (Issue 5: with timestamp)
      try {
        const payload: PendingSyncPayload = { data, saved_at: new Date().toISOString() };
        await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(payload));
      } catch {
        // Storage full — silently fail
      }
    } finally {
      if (isMounted.current) setSyncing(false);
    }
  };

  const scheduleDebouncedSave = (data: NotificationPreferencesUpdate) => {
    // Merge into pending update
    pendingUpdate.current = { ...pendingUpdate.current, ...data };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const toSave = pendingUpdate.current;
      pendingUpdate.current = {};
      saveToBackend(toSave);
    }, DEBOUNCE_MS);
  };

  /** Issue 9: Single setPrefs call that also writes cache atomically. */
  const updatePref = useCallback(
    <K extends keyof NotificationPreferencesUpdate>(
      field: K,
      value: NotificationPreferencesUpdate[K],
    ) => {
      setPrefs((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [field]: value };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      scheduleDebouncedSave({ [field]: value } as NotificationPreferencesUpdate);
    },
    [],
  );

  const updateMedicationOverride = useCallback(
    (medId: string, override: MedicationNotificationOverride | null) => {
      setPrefs((prev) => {
        if (!prev) return prev;
        const newOverrides = { ...prev.medication_overrides };
        if (override === null) {
          delete newOverrides[medId];
        } else {
          newOverrides[medId] = override;
        }
        const updated = { ...prev, medication_overrides: newOverrides };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      scheduleDebouncedSave({
        medication_overrides: { [medId]: override },
      });
    },
    [],
  );

  return {
    prefs,
    loading,
    syncing,
    updatePref,
    updateMedicationOverride,
    refresh: syncFromBackend,
  };
}
