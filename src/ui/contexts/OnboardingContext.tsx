import React, { createContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import Constants from 'expo-constants';
import { createLogger } from '../../utils/logger';
import type { OnboardingContextType, OnboardingFlags, HintId, TargetRect } from '../../domain/types';

// Gate: only clears onboarding flags when EXPO_PUBLIC_ONBOARDING_TEST_MODE=true
const ONBOARDING_TEST_MODE =
  Constants.expoConfig?.extra?.ONBOARDING_TEST_MODE === 'true' ||
  process.env.EXPO_PUBLIC_ONBOARDING_TEST_MODE === 'true';

const logger = createLogger('Onboarding');

const STORAGE_KEYS = {
  onboarding_complete: '@vision_onboarding_complete',
  tour_complete: '@vision_tour_complete',
  hint_H1_shown: '@vision_hint_H1_shown',
  hint_H2_shown: '@vision_hint_H2_shown',
  hint_H3_shown: '@vision_hint_H3_shown',
  hint_H4_shown: '@vision_hint_H4_shown',
  hint_H5_shown: '@vision_hint_H5_shown',
  hint_H6_shown: '@vision_hint_H6_shown',
  hint_H7_shown: '@vision_hint_H7_shown',
} as const;

const ALL_KEYS = Object.values(STORAGE_KEYS);

// Session counter — stored separately so test-mode clear doesn't reset it
const SESSION_COUNT_KEY = '@vision_session_count';
// Smart guard keys — set by screens when user discovers feature organically
export const GUARD_KEYS = {
  filter_used: '@vision_guard_filter_used',
  archive_visited: '@vision_guard_archive_visited',
  multiselect_used: '@vision_guard_multiselect_used',
} as const;

const DEFAULT_FLAGS: OnboardingFlags = {
  onboarding_complete: false,
  tour_complete: false,
  hint_H1_shown: false,
  hint_H2_shown: false,
  hint_H3_shown: false,
  hint_H4_shown: false,
  hint_H5_shown: false,
  hint_H6_shown: false,
  hint_H7_shown: false,
};

export const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile, updateProfile } = useAuth();
  const { showAlert } = useAlert();

  // State
  const [flags, setFlags] = useState<OnboardingFlags>(DEFAULT_FLAGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStartPending, setTourStartPending] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [activeHint, setActiveHint] = useState<HintId | null>(null);
  const [targetRects, setTargetRects] = useState<(TargetRect | null)[]>([null, null, null, null]);
  const [sessionCount, setSessionCount] = useState(0);

  // Refs for guards
  const advanceDebounceRef = useRef(false);
  const layoutReportedRef = useRef(false);
  const isResettingRef = useRef(false);

  // Load all flags from AsyncStorage on mount
  useEffect(() => {
    const loadFlags = async () => {
      try {
        const keys = Object.keys(STORAGE_KEYS) as (keyof OnboardingFlags)[];
        const loaded: OnboardingFlags = { ...DEFAULT_FLAGS };

        // TEST MODE: clear all flags to replay the full onboarding flow
        if (ONBOARDING_TEST_MODE) {
          const clearPairs: [string, string][] = ALL_KEYS.map(key => [key, 'false']);
          await AsyncStorage.multiSet(clearPairs);
          console.log('[Onboarding] TEST MODE: All flags cleared');
        } else {
          for (const key of keys) {
            const val = await AsyncStorage.getItem(STORAGE_KEYS[key]);
            loaded[key] = val === 'true';
          }
        }

        // Increment session count if tour was previously completed
        if (loaded.tour_complete) {
          const countStr = await AsyncStorage.getItem(SESSION_COUNT_KEY);
          const count = countStr ? parseInt(countStr, 10) : 0;
          const newCount = count + 1;
          await AsyncStorage.setItem(SESSION_COUNT_KEY, String(newCount));
          setSessionCount(newCount);
          logger.info('Session count incremented', { sessionCount: newCount });
        }

        // If backend profile says onboarding is complete (e.g. new device),
        // override local flag so welcome tour doesn't replay
        if (!loaded.onboarding_complete && profile?.onboarding_complete) {
          loaded.onboarding_complete = true;
          loaded.tour_complete = true;
          await AsyncStorage.setItem(STORAGE_KEYS.onboarding_complete, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.tour_complete, 'true');
          logger.info('Onboarding flags synced from backend (new device)');
        }

        setFlags(loaded);
        setIsLoaded(true);
        logger.info('Flags loaded', {
          onboarding_complete: loaded.onboarding_complete,
          tour_complete: loaded.tour_complete,
          hints_shown: Object.entries(loaded).filter(([k, v]) => k.startsWith('hint_') && v).length,
        });
      } catch (error) {
        logger.error('Failed to load onboarding flags', { error });
        setIsLoaded(true); // Don't block the app
      }
    };
    loadFlags();
  }, [profile?.onboarding_complete]);

  // Show welcome on sign-in (if first time), reset on sign-out.
  // Must wait for profile to load so we can check backend onboarding_complete
  // (covers new device OR sign-out/sign-in where AsyncStorage was cleared but
  // backend already marked onboarding done).
  useEffect(() => {
    if (!isLoaded) return;
    if (isAuthenticated) {
      // Wait for profile to arrive before deciding — avoids false-positive welcome
      if (profile === null) return;
      // Backend is authoritative: if backend says done, never show welcome —
      // even if local flags haven't synced yet (race between loadFlags and this effect).
      if (profile.onboarding_complete) {
        setIsWelcomeVisible(false);
        return;
      }
      // Show welcome only if BOTH local and backend say not complete
      if (!flags.onboarding_complete) {
        setIsWelcomeVisible(true);
        logger.info('Welcome screen shown for new user');
      }
    } else {
      // Signed out — reset all in-memory visibility (without touching AsyncStorage)
      setIsWelcomeVisible(false);
      setIsTourActive(false);
      setTourStartPending(false);
      setTourStep(0);
      setLayoutReady(false);
      layoutReportedRef.current = false;
      setActiveHint(null);
    }
  }, [isAuthenticated, isLoaded, flags.onboarding_complete, profile?.onboarding_complete]);

  // completeWelcome: dismiss welcome, set tourStartPending
  const completeWelcome = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.onboarding_complete, 'true');
      setFlags(prev => ({ ...prev, onboarding_complete: true }));
      setIsWelcomeVisible(false);
      setTourStartPending(true);
      // Persist to backend so other devices know onboarding is done
      updateProfile({ onboarding_complete: true }).catch(() => {});
      // If layout is already ready, start tour immediately
      if (layoutReady) {
        setIsTourActive(true);
        setTourStartPending(false);
      }
      logger.info('Welcome screen dismissed');
    } catch (error) {
      logger.error('Failed to complete welcome', { error });
    }
  }, [layoutReady]);

  // reportLayoutReady: signal that Home Screen is rendered and data loaded
  const reportLayoutReady = useCallback(() => {
    if (layoutReportedRef.current) return;
    layoutReportedRef.current = true;
    setLayoutReady(true);
    logger.debug('Layout ready signal received');
  }, []);

  // When layoutReady becomes true and tourStartPending, start the tour
  useEffect(() => {
    if (layoutReady && tourStartPending) {
      setIsTourActive(true);
      setTourStartPending(false);
      logger.debug('Tour started after layout ready');
    }
  }, [layoutReady, tourStartPending]);

  // advanceTour: next step or complete (with 200ms debounce)
  const advanceTour = useCallback(() => {
    if (advanceDebounceRef.current) return;
    advanceDebounceRef.current = true;
    setTimeout(() => { advanceDebounceRef.current = false; }, 200);

    setTourStep(prev => {
      if (prev >= 3) {
        return prev;
      }
      logger.debug('Tour step advanced', { from: prev, to: prev + 1 });
      return prev + 1;
    });
  }, []);

  // skipTour: end tour immediately
  const skipTour = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.tour_complete, 'true');
      setFlags(prev => ({ ...prev, tour_complete: true }));
      setIsTourActive(false);
      setTourStep(0);
      logger.info('Tour skipped');
    } catch (error) {
      logger.error('Failed to skip tour', { error });
    }
  }, []);

  // completeTour: set flag, show toast, trigger delayed auto-nav via state
  const completeTour = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.tour_complete, 'true');
      setFlags(prev => ({ ...prev, tour_complete: true }));
      setIsTourActive(false);
      setTourStep(0);

      // Show "You're all set!" toast using the AlertProvider
      showAlert({
        title: "You're all set!",
        type: 'success',
      });

      logger.info('Tour completed');
    } catch (error) {
      logger.error('Failed to complete tour', { error });
    }
  }, [showAlert]);

  // setTargetRect for tour spotlights
  const setTargetRect = useCallback((step: number, rect: TargetRect) => {
    setTargetRects(prev => {
      const next = [...prev];
      next[step] = rect;
      return next;
    });
  }, []);

  // checkHint: pure read — returns true if hint should show
  const checkHint = useCallback((id: HintId, condition: boolean): boolean => {
    if (!condition) return false;
    if (isTourActive || tourStartPending || isWelcomeVisible) return false;
    if (!flags.tour_complete) return false; // Don't show hints until tour is done
    if (activeHint !== null) return false;
    const flagKey = `hint_${id}_shown` as keyof OnboardingFlags;
    if (flags[flagKey]) return false;
    return true;
  }, [isTourActive, tourStartPending, isWelcomeVisible, activeHint, flags]);

  // activateHint: set activeHint (separate from checkHint per D9 fix 3)
  const activateHint = useCallback((id: HintId) => {
    setActiveHint(id);
  }, []);

  // dismissHint: mark hint as shown, clear activeHint
  const dismissHint = useCallback(async (id: HintId) => {
    const flagKey = `hint_${id}_shown` as keyof OnboardingFlags;
    const storageKey = STORAGE_KEYS[flagKey];
    try {
      await AsyncStorage.setItem(storageKey, 'true');
      setFlags(prev => ({ ...prev, [flagKey]: true }));
      setActiveHint(null);
      logger.info('Hint dismissed', { hint: id });
    } catch (error) {
      // In-memory state still updates even if storage fails
      setFlags(prev => ({ ...prev, [flagKey]: true }));
      setActiveHint(null);
      logger.error('Failed to persist hint dismissal', { hint: id, error });
    }
  }, []);

  // resetAll: clear all flags and restart onboarding
  const resetAll = useCallback(async () => {
    if (isResettingRef.current) return;
    isResettingRef.current = true;
    try {
      const pairs: [string, string][] = ALL_KEYS.map(key => [key, 'false']);
      await AsyncStorage.multiSet(pairs);
      // Also clear session count and smart guards
      await AsyncStorage.multiRemove([SESSION_COUNT_KEY, ...Object.values(GUARD_KEYS)]);
      setFlags(DEFAULT_FLAGS);
      setSessionCount(0);
      setIsWelcomeVisible(true);
      setIsTourActive(false);
      setTourStartPending(false);
      setTourStep(0);
      setLayoutReady(false);
      layoutReportedRef.current = false;
      setActiveHint(null);
      logger.info('Onboarding reset — all flags, session count, and guards cleared');
    } catch (error) {
      logger.error('Failed to reset onboarding', { error });
    } finally {
      isResettingRef.current = false;
    }
  }, []);

  const value = useMemo<OnboardingContextType>(() => ({
    isWelcomeVisible,
    isTourActive,
    tourStep,
    layoutReady,
    activeHint,
    flags,
    isLoaded,
    targetRects,
    sessionCount,
    completeWelcome,
    advanceTour,
    skipTour,
    completeTour,
    reportLayoutReady,
    setTargetRect,
    checkHint,
    activateHint,
    dismissHint,
    resetAll,
  }), [
    isWelcomeVisible, isTourActive, tourStep, layoutReady, activeHint,
    flags, isLoaded, targetRects, sessionCount,
    completeWelcome, advanceTour, skipTour, completeTour,
    reportLayoutReady, setTargetRect, checkHint, activateHint, dismissHint, resetAll,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
