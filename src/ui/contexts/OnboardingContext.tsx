import React, { createContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { createLogger } from '../../utils/logger';
import type { OnboardingContextType, OnboardingFlags, HintId, TargetRect } from '../../domain/types';

const logger = createLogger('Onboarding');

const STORAGE_KEYS = {
  onboarding_complete: '@vision_onboarding_complete',
  tour_complete: '@vision_tour_complete',
  hint_H1_shown: '@vision_hint_H1_shown',
  hint_H2_shown: '@vision_hint_H2_shown',
  hint_H3_shown: '@vision_hint_H3_shown',
  hint_H4_shown: '@vision_hint_H4_shown',
  hint_H5_shown: '@vision_hint_H5_shown',
} as const;

const ALL_KEYS = Object.values(STORAGE_KEYS);

const DEFAULT_FLAGS: OnboardingFlags = {
  onboarding_complete: false,
  tour_complete: false,
  hint_H1_shown: false,
  hint_H2_shown: false,
  hint_H3_shown: false,
  hint_H4_shown: false,
  hint_H5_shown: false,
};

export const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
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

  // Refs for guards
  const advanceDebounceRef = useRef(false);
  const layoutReportedRef = useRef(false);
  const isResettingRef = useRef(false);

  // Load all flags from AsyncStorage on mount
  useEffect(() => {
    const loadFlags = async () => {
      try {
        // ⚠️ TEST ONLY: Clear all onboarding flags to replay full flow
        const clearPairs: [string, string][] = ALL_KEYS.map(key => [key, 'false']);
        await AsyncStorage.multiSet(clearPairs);
        console.log('[Onboarding] TEST MODE: All flags cleared');

        const loaded: OnboardingFlags = { ...DEFAULT_FLAGS };
        setFlags(loaded);

        // Show welcome screen (fresh install simulation)
        setIsWelcomeVisible(true);

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
  }, []);

  // Reset in-memory visibility on sign-out (without touching AsyncStorage)
  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) {
      setIsWelcomeVisible(false);
      setIsTourActive(false);
      setTourStartPending(false);
      setActiveHint(null);
    }
  }, [isAuthenticated, isLoaded]);

  // completeWelcome: dismiss welcome, set tourStartPending
  const completeWelcome = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.onboarding_complete, 'true');
      setFlags(prev => ({ ...prev, onboarding_complete: true }));
      setIsWelcomeVisible(false);
      setTourStartPending(true);
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
      setFlags(DEFAULT_FLAGS);
      setIsWelcomeVisible(true);
      setIsTourActive(false);
      setTourStartPending(false);
      setTourStep(0);
      setLayoutReady(false);
      layoutReportedRef.current = false;
      setActiveHint(null);
      logger.info('Onboarding reset — all flags cleared');
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
    flags, isLoaded, targetRects,
    completeWelcome, advanceTour, skipTour, completeTour,
    reportLayoutReady, setTargetRect, checkHint, activateHint, dismissHint, resetAll,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
