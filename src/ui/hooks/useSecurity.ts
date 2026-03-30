import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometrics } from '../../data/utils/biometrics';
import * as LocalAuthentication from 'expo-local-authentication';

// expo-screen-capture requires a development build (native module).
// In Expo Go the module doesn't exist, so we lazy-load and guard every call.
let ScreenCapture: typeof import('expo-screen-capture') | null = null;
try {
  ScreenCapture = require('expo-screen-capture');
} catch {
  // Native module not available (Expo Go) — all calls will be skipped
}

// AsyncStorage keys (same as PrivacySecurityScreen)
const BIOMETRIC_KEY = '@vitalic:biometric_enabled';
const AUTO_LOCK_KEY = '@vision_auto_lock_timeout';
const SCREEN_SECURITY_KEY = '@vision_screen_security';
const SCREEN_SECURITY_GRANULARITY_KEY = '@vision_screen_security_granularity';

type Granularity = 'sensitive_only' | 'all';

export interface SecurityContextType {
  isLoading: boolean;
  // Lock
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
  // Biometric settings
  biometricEnabled: boolean;
  autoLockTimeout: number;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  setAutoLockTimeout: (v: number) => Promise<void>;
  resetInactivityTimer: () => void;
  // Biometric metadata
  biometricAvailable: boolean;
  biometricMethodName: string | null;
  lastAuthenticatedAt: number | null;
  recordAuthentication: () => void;
  requiresElevatedAuth: (graceMinutes?: number) => boolean;
  // Screen security
  screenSecurityEnabled: boolean;
  screenSecurityGranularity: Granularity;
  setScreenSecurityEnabled: (v: boolean) => Promise<void>;
  setScreenSecurityGranularity: (v: Granularity) => Promise<void>;
  // Privacy overlay
  isAppSwitcherVisible: boolean;
  // Screen recording
  isScreenBeingRecorded: boolean;
  // Dev mode
  devForceScreenSecurity: boolean;
  setDevForceScreenSecurity: (v: boolean) => void;
}

export const SecurityContext = createContext<SecurityContextType | null>(null);

export function useSecurityProvider(): SecurityContextType {
  // Loading gate — prevents content flash before settings are read
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(5);
  const [screenSecurityEnabled, setScreenSecurityEnabledState] = useState(false);
  const [screenSecurityGranularity, setScreenSecurityGranularityState] =
    useState<Granularity>('sensitive_only');

  // Lock state
  const [isLocked, setIsLocked] = useState(false);

  // Biometric metadata
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricMethodName, setBiometricMethodName] = useState<string | null>(null);
  const [lastAuthenticatedAt, setLastAuthenticatedAt] = useState<number | null>(null);

  // App switcher / recording
  const [isAppSwitcherVisible, setIsAppSwitcherVisible] = useState(false);
  const [isScreenBeingRecorded, setIsScreenBeingRecorded] = useState(false);

  // Dev mode
  const [devForceScreenSecurity, setDevForceScreenSecurity] = useState(false);

  // Refs for timer logic
  const lastActivityRef = useRef<number>(Date.now());
  const backgroundTimestampRef = useRef<number | null>(null);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [bio, lock, sec, gran] = await Promise.all([
          AsyncStorage.getItem(BIOMETRIC_KEY),
          AsyncStorage.getItem(AUTO_LOCK_KEY),
          AsyncStorage.getItem(SCREEN_SECURITY_KEY),
          AsyncStorage.getItem(SCREEN_SECURITY_GRANULARITY_KEY),
        ]);

        const bioEnabled = bio === 'true';
        setBiometricEnabledState(bioEnabled);
        if (lock !== null) setAutoLockTimeoutState(parseInt(lock, 10));
        if (sec !== null) setScreenSecurityEnabledState(sec === 'true');
        if (gran !== null)
          setScreenSecurityGranularityState(gran as Granularity);

        // Cold-start locking is now handled by BiometricGateScreen in AppNavigator.
        // useSecurity only handles mid-session re-locking via the inactivity timer.
      } catch (e) {
        console.error('[Security] Failed to load settings:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Detect biometric hardware on mount
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const detect = async () => {
      try {
        const available = await biometrics.isAvailable();
        setBiometricAvailable(available);

        if (available) {
          const types = await biometrics.supportedTypes();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricMethodName(Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricMethodName(
              Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint',
            );
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricMethodName('Iris');
          } else {
            setBiometricMethodName('Biometrics');
          }
        }
      } catch (e) {
        console.error('[Security] Biometric detection error:', e);
      }
    };
    detect();
  }, []);

  // Lock / unlock
  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
    setLastAuthenticatedAt(Date.now());
    lastActivityRef.current = Date.now();
  }, []);

  const recordAuthentication = useCallback(() => {
    setLastAuthenticatedAt(Date.now());
  }, []);

  const requiresElevatedAuth = useCallback(
    (graceMinutes = 2) => {
      if (!biometricEnabled) return false;
      if (lastAuthenticatedAt === null) return true;
      const elapsed = Date.now() - lastAuthenticatedAt;
      return elapsed > graceMinutes * 60 * 1000;
    },
    [biometricEnabled, lastAuthenticatedAt],
  );

  // Inactivity timer reset
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Inactivity interval: check every 30 seconds
  useEffect(() => {
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      inactivityIntervalRef.current = null;
    }

    if (!biometricEnabled || autoLockTimeout <= 0) {
      // autoLockTimeout === 0 means "Immediately" (handled by AppState),
      // autoLockTimeout === -1 means "Never"
      return;
    }

    inactivityIntervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const timeoutMs = autoLockTimeout * 60 * 1000;
      if (idleMs >= timeoutMs && !isLocked) {
        setIsLocked(true);
      }
    }, 30_000);

    return () => {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
    };
  }, [biometricEnabled, autoLockTimeout, isLocked]);

  // AppState listener for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // Privacy overlay must be set IMMEDIATELY — no debounce.
      // iOS captures the app switcher snapshot the instant state becomes
      // 'inactive'. Any delay (even 16ms for a React re-render) risks
      // the snapshot being taken before the overlay renders.
      if (screenSecurityEnabled) {
        setIsAppSwitcherVisible(nextState === 'inactive');
      } else {
        setIsAppSwitcherVisible(false);
      }

      // Debounce the lock logic to avoid rapid iOS state transitions
      // (inactive → background → active can fire in quick succession)
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (nextState === 'background' || nextState === 'inactive') {
          backgroundTimestampRef.current = Date.now();
        } else if (nextState === 'active') {
          if (biometricEnabled && backgroundTimestampRef.current !== null) {
            const elapsed = Date.now() - backgroundTimestampRef.current;

            if (autoLockTimeout === 0) {
              // "Immediately": lock on any return from background
              setIsLocked(true);
            } else if (autoLockTimeout > 0) {
              const timeoutMs = autoLockTimeout * 60 * 1000;
              if (elapsed >= timeoutMs) {
                setIsLocked(true);
              }
            }
            // autoLockTimeout === -1 ("Never"): never auto-lock on return
          }
          backgroundTimestampRef.current = null;
        }
      }, 100);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [biometricEnabled, autoLockTimeout, screenSecurityEnabled]);

  // iOS native app switcher blur protection via expo-screen-capture.
  // enableAppSwitcherProtectionAsync applies a native blur at the OS level
  // before iOS captures the app switcher snapshot — React overlays alone
  // cannot beat the OS snapshot timing.
  // Note: This requires a development build (npx expo run:ios). In Expo Go,
  // the call may silently no-op because the native module isn't compiled in.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !ScreenCapture) return;

    if (!screenSecurityEnabled) {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      return;
    }

    ScreenCapture.enableAppSwitcherProtectionAsync(0.95).catch((e) => {
      console.warn('[Security] enableAppSwitcherProtectionAsync failed:', e);
    });

    return () => {
      ScreenCapture?.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [screenSecurityEnabled]);

  // Setters that persist to AsyncStorage
  const setBiometricEnabled = useCallback(async (v: boolean) => {
    setBiometricEnabledState(v);
    await AsyncStorage.setItem(BIOMETRIC_KEY, v.toString());
    if (!v) {
      // Turning biometric off: unlock if locked
      setIsLocked(false);
    }
  }, []);

  const setAutoLockTimeout = useCallback(async (v: number) => {
    setAutoLockTimeoutState(v);
    await AsyncStorage.setItem(AUTO_LOCK_KEY, v.toString());
  }, []);

  const setScreenSecurityEnabled = useCallback(async (v: boolean) => {
    setScreenSecurityEnabledState(v);
    await AsyncStorage.setItem(SCREEN_SECURITY_KEY, v.toString());
  }, []);

  const setScreenSecurityGranularity = useCallback(async (v: Granularity) => {
    setScreenSecurityGranularityState(v);
    await AsyncStorage.setItem(SCREEN_SECURITY_GRANULARITY_KEY, v);
  }, []);

  return {
    isLoading,
    isLocked,
    lockApp,
    unlockApp,
    biometricEnabled,
    autoLockTimeout,
    setBiometricEnabled,
    setAutoLockTimeout,
    resetInactivityTimer,
    biometricAvailable,
    biometricMethodName,
    lastAuthenticatedAt,
    recordAuthentication,
    requiresElevatedAuth,
    screenSecurityEnabled,
    screenSecurityGranularity,
    setScreenSecurityEnabled,
    setScreenSecurityGranularity,
    isAppSwitcherVisible,
    isScreenBeingRecorded,
    devForceScreenSecurity,
    setDevForceScreenSecurity,
  };
}

export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
