import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticEnabled } from '../../data/utils/haptics';
import { setSoundEnabled } from '../../data/utils/notifications';

// ── Types ──────────────────────────────────────────────────────────────

export interface AppPreferences {
  reducedMotion: boolean;
  hapticFeedback: boolean;
  theme: 'dark' | 'light' | 'system';
  timeFormat: '12h' | '24h';
  defaultDoseTime: string; // HH:MM 24h format
  soundEnabled: boolean;
}

export interface AppPreferencesContextType {
  prefs: AppPreferences;
  updatePref: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  resetPreferences: () => Promise<void>;
  loading: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULTS: AppPreferences = {
  reducedMotion: false,
  hapticFeedback: true,
  theme: 'dark',
  timeFormat: '12h',
  defaultDoseTime: '08:00',
  soundEnabled: true,
};

// ── AsyncStorage keys ──────────────────────────────────────────────────

const KEYS: Record<keyof AppPreferences, string> = {
  reducedMotion: '@vision_reduced_motion',
  hapticFeedback: '@vision_haptic_feedback',
  theme: '@vision_theme',
  timeFormat: '@vision_time_format',
  defaultDoseTime: '@vision_default_dose_time',
  soundEnabled: '@vision_sound_enabled',
};

// ── Context ────────────────────────────────────────────────────────────

export const AppPreferencesContext = createContext<AppPreferencesContextType>({
  prefs: DEFAULTS,
  updatePref: () => {},
  resetPreferences: async () => {},
  loading: true,
});

export function useAppPreferences(): AppPreferencesContextType {
  return useContext(AppPreferencesContext);
}

// ── Provider hook ──────────────────────────────────────────────────────

export function useAppPreferencesProvider(): AppPreferencesContextType {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Load all preferences from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const keys = Object.values(KEYS);
        const pairs = await AsyncStorage.multiGet(keys);

        const loaded: Partial<AppPreferences> = {};
        for (const [key, value] of pairs) {
          if (value === null) continue;
          const prefKey = Object.entries(KEYS).find(([, v]) => v === key)?.[0] as keyof AppPreferences | undefined;
          if (!prefKey) continue;

          if (prefKey === 'reducedMotion' || prefKey === 'hapticFeedback' || prefKey === 'soundEnabled') {
            (loaded as any)[prefKey] = value === 'true';
          } else {
            (loaded as any)[prefKey] = value;
          }
        }

        const merged = { ...DEFAULTS, ...loaded };

        if (mountedRef.current) {
          setPrefs(merged);
          // Sync module-level refs with persisted values
          setHapticEnabled(merged.hapticFeedback);
          setSoundEnabled(merged.soundEnabled);
          setLoading(false);
        }
      } catch (error) {
        console.error('[AppPreferences] Failed to load preferences:', error);
        // Fall back to defaults — sync module refs to defaults
        setHapticEnabled(DEFAULTS.hapticFeedback);
        setSoundEnabled(DEFAULTS.soundEnabled);
        if (mountedRef.current) setLoading(false);
      }
    };

    load();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updatePref = useCallback(<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));

    // Persist to AsyncStorage (fire-and-forget)
    const storageKey = KEYS[key];
    const storageValue = typeof value === 'boolean' ? String(value) : String(value);
    AsyncStorage.setItem(storageKey, storageValue).catch(err => {
      console.error(`[AppPreferences] Failed to persist ${key}:`, err);
    });

    // Sync module-level refs for non-React modules
    if (key === 'hapticFeedback') {
      setHapticEnabled(value as boolean);
    } else if (key === 'soundEnabled') {
      setSoundEnabled(value as boolean);
    }
  }, []);

  const resetPreferences = useCallback(async () => {
    // Reset in-memory state to defaults
    setPrefs(DEFAULTS);

    // Reset module-level refs
    setHapticEnabled(true);
    setSoundEnabled(true);

    // Clear all preference keys from AsyncStorage
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch (error) {
      console.error('[AppPreferences] Failed to clear preferences:', error);
    }

    console.warn('[AppPreferences] Preferences reset to defaults — account deletion context');
  }, []);

  return { prefs, updatePref, resetPreferences, loading };
}
