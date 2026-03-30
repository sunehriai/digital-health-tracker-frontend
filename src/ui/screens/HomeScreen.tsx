import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, AppState } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroSection from '../components/HeroSection';
import VictoryCard from '../components/VictoryCard';
import VictorySyncAnimation from '../components/VictorySyncAnimation';
import ActionCenterCard from '../components/ActionCenterCard';
import RitualsCarousel, { RitualsCarouselRef } from '../components/RitualsCarousel';

import AdherenceCard from '../components/AdherenceCard';
import GamificationHeader from '../components/GamificationHeader';
import XpAnimation from '../components/XpAnimation';
import TierCelebration from '../components/TierCelebration';
import WaiverPrompt from '../components/WaiverPrompt';
import WelcomeBackModal, { shouldShowWelcomeBack, markWelcomeBackShown } from '../components/WelcomeBackModal';
import LowStockBadge from '../components/LowStockBadge';
import LowStockBottomSheet from '../components/LowStockBottomSheet';
import type { LowStockModalRef } from '../components/LowStockBottomSheet';
import { useMedications } from '../hooks/useMedications';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useAlert } from '../context/AlertContext';
import { useGamification } from '../hooks/useGamification';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { doseStatusCache } from '../../data/utils/doseStatusCache';
import { medicationEvents } from '../../data/utils/medicationEvents';
import { estimateDailyXp } from '../../domain/utils/xpCalculator';
import { TIER_ASSETS, TIER_NAMES, getTierAsset } from '../../domain/constants/tierAssets';
import type { RootStackParamList } from '../navigation/types';
import { calculateLowStockDoses, getOccurrenceCount } from '../../domain/medicationConfig';
import type { Medication, DoseTimeSlot, RevertableDose } from '../../domain/types';
import {
  getNextDoseTime,
  formatTime,
  formatDoseDate,
  formatMealRelation,
  isToday,
  getTomorrowsDoses,
  buildTodaysRituals,
  getRitualStats,
  isAllRitualsComplete,
  getVictoryInsight,
  shouldShowActionCenter,
  getOldestMissedRitual,
  getActionCenterInsight,
  getCriticalMissedRitual,
  canRevertDose,
} from '../../domain/utils';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../data/api/client';
import { ENDPOINTS } from '../../data/api/endpoints';
import ScreenshotToast from '../components/ScreenshotToast';
import DoseToast from '../components/DoseToast';
import AnimatedPressable from '../components/AnimatedPressable';
import { useOnboarding } from '../hooks/useOnboarding';
import { useAuth } from '../hooks/useAuth';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import auth from '@react-native-firebase/auth';
import { authService } from '../../data/services/authService';
import { measureElement } from '../utils/measureElement';
import SpotlightHint from '../components/onboarding/SpotlightHint';
import type { TargetRect } from '../../domain/types';
import { getRandomDoseMessage } from '../../domain/utils/doseMessages';
import { logEndOfDay } from '../../data/utils/notificationDebugLog';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlert } = useAlert();
  const { activeMedications, loading: medsLoading, fetchMedications, logDoseBatch, logDose, revertDose } = useMedications();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('Home');
  const { prefs: { timeFormat } } = useAppPreferences();
  const { colors, isDark } = useTheme();
  const { prefs: notifPrefs } = useNotificationPrefs();
  const { user, firebaseUser, refreshProfile, isEmailVerified, hoursSinceCreation } = useAuth();
  const lowStockSheetRef = useRef<LowStockModalRef>(null);

  // Onboarding: layout ready signal + hints + FAB measurement
  const { reportLayoutReady, setTargetRect, checkHint, activateHint, dismissHint, activeHint, isTourActive, isWelcomeVisible, flags, sessionCount } = useOnboarding();
  const layoutReportedRef = useRef(false);
  const [rootLayoutDone, setRootLayoutDone] = useState(false);
  const [tierBadgeRect, setTierBadgeRect] = useState<TargetRect | null>(null);
  const tierBadgeRef = useRef<View>(null);
  const adherenceCardRef = useRef<View>(null);
  const [adherenceCardRect, setAdherenceCardRect] = useState<TargetRect | null>(null);

  // Step 40: Gamification hook for XP estimation, tier detection, waiver, etc.
  const {
    totalXp,
    currentTier,
    streakDays,
    comebackBoostActive,
    comebackBoostUntil,
    waiverBadges,
    hasMissedYesterday,
    isOnline,
    refreshStatus,
    refreshAndDetectTierUp,
  } = useGamification();

  // Track medications that have been taken today (to skip them in next dose calculation)
  // Using array instead of Set for more reliable React state updates
  const [takenTodayArray, setTakenTodayArray] = useState<string[]>([]);

  // Derived Set for O(1) lookups (recalculates when array changes)
  const takenTodayIds = useMemo(() => new Set(takenTodayArray), [takenTodayArray]);

  // Version counter to force memo recalculation (backup mechanism)
  const [stateVersion, setStateVersion] = useState(0);

  // Lock to prevent race conditions during dose logging
  const [isLoggingDose, setIsLoggingDose] = useState(false);

  // Victory animation state
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [wasInActionCenter, setWasInActionCenter] = useState(false);

  // In-memory tracking for revertable doses (not persisted - cleared on app restart)
  const [revertableDoses, setRevertableDoses] = useState<RevertableDose[]>([]);

  // Step 35/40: XP Animation state (D17 Delayed Counter Trick)
  const [xpAnimationTrigger, setXpAnimationTrigger] = useState(false);
  const [xpAnimationAmount, setXpAnimationAmount] = useState(0);

  // Step 36/40: Tier Celebration state
  const [showTierCelebration, setShowTierCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState(1);

  // N-21/BP-021: Modal priority state machine — welcomeBack > waiver, never simultaneous
  const [pendingModal, setPendingModal] = useState<'none' | 'welcomeBack' | 'waiver'>('none');
  const showWaiverPrompt = pendingModal === 'waiver';
  const showWelcomeBack = pendingModal === 'welcomeBack';
  const waiverCheckedRef = useRef(false);
  const modalCheckedRef = useRef(false);

  // Track whether a waiver badge was consumed this session
  const [waiverJustUsed, setWaiverJustUsed] = useState(false);

  // N-22/BP-022: Track boost label per foreground session
  const [hasShownBoostLabel, setHasShownBoostLabel] = useState(false);

  // Bug #4 fix: Tick counter to force Action Center recalculation at grace period boundary
  const [actionCenterTick, setActionCenterTick] = useState(0);

  // Dose toast state (peppy messages on successful dose)
  const [doseToast, setDoseToast] = useState<{ visible: boolean; title: string; body: string }>({
    visible: false, title: '', body: '',
  });

  // Email verification banner state (B16)
  const [bannerDismissed, setBannerDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    AsyncStorage.getItem('@vitalic:email_verify_dismissed').then(val => {
      setBannerDismissed(val === 'true');
    });
  }, []);

  // Phase 1 (0-12hr): soft banner with dismiss
  // Phase 1b (12-24hr): escalated banner, overrides dismiss (Q3)
  // Phase 2 (24hr+): handled by AppNavigator hard gate, not HomeScreen
  const isUnverifiedEmail = !!user && user.auth_provider === 'email' && !isEmailVerified;
  const showSoftBanner = isUnverifiedEmail && hoursSinceCreation < 12 && !bannerDismissed;
  const showEscalatedBanner = isUnverifiedEmail && hoursSinceCreation >= 12 && hoursSinceCreation < 24;
  const showVerificationBanner = showSoftBanner || showEscalatedBanner;
  const hoursRemaining = Math.max(0, Math.ceil(24 - hoursSinceCreation));

  // D21: Re-check verification status when app returns to foreground
  // Q8: Check if email changed via deferred verifyBeforeUpdateEmail()
  useEffect(() => {
    if (!showVerificationBanner && !user?.email) return;
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Existing: check email verification
        if (showVerificationBanner) {
          const verified = await authService.checkEmailVerified();
          if (verified) {
            setBannerDismissed(true);
            await AsyncStorage.setItem('@vitalic:email_verify_dismissed', 'true');
          }
        }

        // Q8: check if email changed via deferred verification
        try {
          const currentFirebaseEmail = auth().currentUser?.email;
          if (currentFirebaseEmail && user?.email && currentFirebaseEmail !== user.email) {
            refreshProfile();
          }
        } catch {}
      }
    });
    return () => subscription.remove();
  }, [showVerificationBanner, user?.email]);

  const handleVerifyNow = async () => {
    await authService.sendVerificationEmail();
  };

  const handleDismissBanner = async () => {
    setBannerDismissed(true);
    await AsyncStorage.setItem('@vitalic:email_verify_dismissed', 'true');
  };

  // Onboarding: report layout ready once data is loaded and layout is measured
  useEffect(() => {
    if (layoutReportedRef.current) return;
    if (rootLayoutDone && !medsLoading) {
      layoutReportedRef.current = true;
      reportLayoutReady();
    }
  }, [rootLayoutDone, medsLoading, reportLayoutReady]);

  // Journey icon hint — only shows on 2nd+ session (not immediately after tour)
  // checkHint blocks if tour_complete is false, so this only fires on subsequent app opens
  const tourJustFinishedRef = useRef(false);
  useEffect(() => {
    // Track if tour was active this session — if so, skip hint this session
    if (isTourActive) tourJustFinishedRef.current = true;
  }, [isTourActive]);

  useFocusEffect(useCallback(() => {
    if (tourJustFinishedRef.current) return;
    // H2: journey icon — session 2+
    if (checkHint('H2', sessionCount >= 2)) {
      const t = setTimeout(() => {
        tierBadgeRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            setTierBadgeRect({ x, y, width: w, height: h });
            activateHint('H2');
          }
        });
      }, 500);
      return () => clearTimeout(t);
    }
    // H7: adherence card — first time tier 2+ (monthly adherence unlocked)
    if (checkHint('H7', currentTier >= 2)) {
      const t = setTimeout(() => {
        adherenceCardRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            setAdherenceCardRect({ x, y, width: w, height: h });
            activateHint('H7');
          }
        });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [checkHint, activateHint, sessionCount, currentTier]));

  // Load persisted taken IDs and revertable doses on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      // Version gate: clear stale cache after dose_times sort-order change (Bug 4D)
      const CACHE_VERSION_KEY = 'vision_cache_v2';
      const cacheVersion = await AsyncStorage.getItem(CACHE_VERSION_KEY);
      if (!cacheVersion) {
        console.info('[HomeScreen] vision_cache_v2 gate: clearing dose status cache for sort-order migration');
        await doseStatusCache.cleanupOldData();
        const todayKey = `vision_dose_status_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        await AsyncStorage.removeItem(todayKey);
        await AsyncStorage.setItem(CACHE_VERSION_KEY, '1');
      } else {
        await doseStatusCache.cleanupOldData();
      }

      const persisted = await doseStatusCache.getTakenToday();
      if (persisted.size > 0) {
        const persistedArray = Array.from(persisted);
        console.log('[HomeScreen] Loaded persisted takenToday:', persistedArray);
        setTakenTodayArray(persistedArray);
        setStateVersion((v) => v + 1);
      }
      // Load and cleanup expired revertable doses
      const revertables = await doseStatusCache.cleanupExpiredRevertables();
      if (revertables.length > 0) {
        console.log('[HomeScreen] Loaded persisted revertableDoses:', revertables.map(r => r.chipId));
        setRevertableDoses(revertables);
      }
    };
    loadPersistedState();
  }, []);

  // N-21: Modal priority state machine — check boost first, then waiver
  // AsyncStorage guard prevents waiver re-showing on screen remount within the same day
  useEffect(() => {
    if (modalCheckedRef.current) return;

    const checkModals = async () => {
      const today = new Date().toISOString().split('T')[0];

      // Priority 1: WelcomeBack modal (comeback boost active)
      if (comebackBoostActive && comebackBoostUntil) {
        const shouldShow = await shouldShowWelcomeBack(comebackBoostUntil);
        if (shouldShow) {
          modalCheckedRef.current = true;
          setPendingModal('welcomeBack');
          await markWelcomeBackShown(comebackBoostUntil);
          return;
        }
      }

      // Priority 2: Waiver prompt — AsyncStorage dedup per day
      if (!waiverCheckedRef.current && hasMissedYesterday && waiverBadges > 0) {
        const waiverKey = `waiverShown:${today}`;
        const alreadyShown = await AsyncStorage.getItem(waiverKey);
        if (alreadyShown) {
          waiverCheckedRef.current = true;
          modalCheckedRef.current = true;
          return;
        }
        waiverCheckedRef.current = true;
        modalCheckedRef.current = true;
        await AsyncStorage.setItem(waiverKey, '1').catch(() => {});
        setPendingModal('waiver');
        return;
      }
    };

    checkModals();
  }, [comebackBoostActive, comebackBoostUntil, hasMissedYesterday, waiverBadges]);

  // N-22/BP-022: Reset hasShownBoostLabel on app foreground (HomeScreen stays mounted)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setHasShownBoostLabel(false);
      }
    });
    return () => sub.remove();
  }, []);

  // Subscribe to medication events for cross-screen sync
  useEffect(() => {
    const unsubPaused = medicationEvents.on('medication_paused', () => {
      fetchMedications();
    });
    const unsubResumed = medicationEvents.on('medication_resumed', () => {
      fetchMedications();
    });
    const unsubDeleted = medicationEvents.on('medication_deleted', () => {
      fetchMedications();
    });
    const unsubArchived = medicationEvents.on('medication_archived', () => {
      fetchMedications();
    });
    const unsubRestored = medicationEvents.on('medication_restored', () => {
      fetchMedications();
    });
    const unsubUpdated = medicationEvents.on('medication_updated', async () => {
      fetchMedications();
      // Also reload persisted dose status to prevent taken chips from unchecking
      const persisted = await doseStatusCache.getTakenToday();
      setTakenTodayArray(Array.from(persisted));
      setStateVersion((v) => v + 1);
    });
    // Reload persisted dose status when a dose is taken from a notification action
    const unsubDoseTaken = medicationEvents.on('dose_taken', async () => {
      console.log('[HomeScreen] dose_taken event received — reloading persisted state');
      const persisted = await doseStatusCache.getTakenToday();
      const persistedArray = Array.from(persisted);
      setTakenTodayArray(persistedArray);
      setStateVersion((v) => v + 1);
    });
    return () => {
      unsubPaused();
      unsubResumed();
      unsubDeleted();
      unsubArchived();
      unsubRestored();
      unsubUpdated();
      unsubDoseTaken();
    };
  }, [fetchMedications]);

  // Refresh medications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMedications();
      // Reload persisted state on focus
      const loadPersisted = async () => {
        await doseStatusCache.cleanupOldData();
        const persisted = await doseStatusCache.getTakenToday();
        const persistedArray = Array.from(persisted);
        console.log('[HomeScreen] Focus: Loaded persisted takenToday:', persistedArray);
        setTakenTodayArray(persistedArray);
        setStateVersion((v) => v + 1);
        // Reload revertable doses (and cleanup expired ones)
        const revertables = await doseStatusCache.cleanupExpiredRevertables();
        console.log('[HomeScreen] Focus: Loaded revertableDoses:', revertables.map(r => r.chipId));
        setRevertableDoses(revertables);
      };
      loadPersisted();
      // Reset animation state on focus if not in victory
      // This handles cases like day change or adding new medications
      setShowVictoryAnimation(false);
      setWasInActionCenter(false);
    }, [fetchMedications])
  );

  // Build today's rituals FIRST (needed for nextDoseSlot calculation)
  // IMPORTANT: This must recalculate when takenTodayArray changes
  const todaysRituals = useMemo(() => {
    console.log('[Rituals] ===== RECALCULATING (v' + stateVersion + ') =====');
    console.log('[Rituals] takenTodayArray:', takenTodayArray);
    const result = buildTodaysRituals(activeMedications, takenTodayIds, timeFormat);
    console.log('[Rituals] result:', result.map(r => `${r.name}: ${r.status}`));
    return result;
  }, [activeMedications, takenTodayArray, takenTodayIds, stateVersion, timeFormat]);

  // Check if all today's rituals are complete
  const allRitualsComplete = useMemo(() => {
    if (todaysRituals.length === 0) return false;
    return todaysRituals.every((r) => r.status === 'completed');
  }, [todaysRituals]);

  // Calculate the next dose time slot aligned with the carousel's "next" chip.
  // Uses the same source of truth (buildTodaysRituals) so hero and carousel always agree.
  const nextDoseSlot = useMemo((): DoseTimeSlot | null => {
    console.log('[NextDose] ===== RECALCULATING (v' + stateVersion + ') =====');
    console.log('[NextDose] takenTodayArray:', takenTodayArray);
    console.log('[NextDose] todaysRituals:', todaysRituals.map(r => `${r.name}: ${r.status}`));

    // Find the next active chip from the carousel (already correctly determined by buildTodaysRituals)
    const nextChip = todaysRituals.find(r => r.status === 'next')
      || todaysRituals.find(r => r.status === 'due' || r.status === 'pending');
    console.log('[NextDose] nextChip from todaysRituals:', nextChip?.name || 'null');

    if (nextChip) {
      const activeTime = nextChip.scheduledTime;
      const medsAtSameTime = todaysRituals
        .filter((r) => {
          const isSameTime = r.scheduledTime.getTime() === activeTime.getTime();
          const isTaken = takenTodayIds.has(r.id);
          return isSameTime && !isTaken;
        })
        .map((r) => {
          const med = activeMedications.find((m) => m.id === r.medicationId);
          return med;
        })
        .filter((m): m is Medication => m !== undefined);

      if (medsAtSameTime.length > 0) {
        const slot: DoseTimeSlot = {
          doseTime: activeTime,
          timeDisplay: formatTime(activeTime, timeFormat),
          dateDisplay: formatDoseDate(activeTime),
          isTodayDose: true,
          medications: medsAtSameTime.map((med) => ({
            medication: med,
            mealInfo: formatMealRelation(med.meal_relation),
            doseInfo: med.dose_size > 1 ? `${med.dose_size} doses` : '1 dose',
          })),
        };

        console.log('[NextDose] Active slot from today:', {
          medsCount: slot.medications.length,
          medNames: slot.medications.map((m) => m.medication.name),
          time: slot.timeDisplay,
        });

        return slot;
      }
    }

    console.log('[NextDose] No active dose today, checking tomorrow...');

    const futureDoseMap = new Map<string, { doseTime: Date; medications: Medication[] }>();

    for (const med of activeMedications) {
      const doseTime = getNextDoseTime(med, new Set([0, 1, 2]));

      if (doseTime && !isToday(doseTime)) {
        const timeKey = doseTime.toISOString();
        if (futureDoseMap.has(timeKey)) {
          futureDoseMap.get(timeKey)!.medications.push(med);
        } else {
          futureDoseMap.set(timeKey, { doseTime, medications: [med] });
        }
      }
    }

    if (futureDoseMap.size === 0) {
      console.log('[NextDose] No future doses found');
      return null;
    }

    let earliest: { doseTime: Date; medications: Medication[] } | null = null;
    for (const entry of futureDoseMap.values()) {
      if (!earliest || entry.doseTime < earliest.doseTime) {
        earliest = entry;
      }
    }

    if (!earliest) return null;

    const slot: DoseTimeSlot = {
      doseTime: earliest.doseTime,
      timeDisplay: formatTime(earliest.doseTime, timeFormat),
      dateDisplay: formatDoseDate(earliest.doseTime),
      isTodayDose: false,
      medications: earliest.medications.map((med) => ({
        medication: med,
        mealInfo: formatMealRelation(med.meal_relation),
        doseInfo: med.dose_size > 1 ? `${med.dose_size} doses` : '1 dose',
      })),
    };

    console.log('[NextDose] Future slot:', {
      medsCount: slot.medications.length,
      medNames: slot.medications.map((m) => m.medication.name),
      time: slot.timeDisplay,
      date: slot.dateDisplay,
    });

    return slot;
  }, [activeMedications, todaysRituals, takenTodayArray, takenTodayIds, stateVersion]);

  const ritualStats = useMemo(() => getRitualStats(todaysRituals), [todaysRituals]);

  const isVictory = useMemo(
    () => isAllRitualsComplete(ritualStats),
    [ritualStats]
  );

  // Calculate tomorrow's dose slot (memoized for performance)
  const tomorrowSlot = useMemo(
    () => getTomorrowsDoses(activeMedications, timeFormat),
    [activeMedications, timeFormat]
  );

  // D9: Replace calculateDailyPoints() with gamification XP
  // Use totalXp from useGamification() (server-authoritative)
  const victoryPoints = totalXp;

  const victoryInsight = useMemo(() => getVictoryInsight(), []);

  // Action Center (Recovery State) calculations
  const showActionCenter = useMemo(
    () => shouldShowActionCenter(todaysRituals, ritualStats),
    [todaysRituals, ritualStats, actionCenterTick]
  );

  const oldestMissedRitual = useMemo(
    () => (showActionCenter ? getOldestMissedRitual(todaysRituals) : null),
    [showActionCenter, todaysRituals]
  );

  const actionCenterInsight = useMemo(
    () => (oldestMissedRitual ? getActionCenterInsight(oldestMissedRitual.name) : ''),
    [oldestMissedRitual]
  );

  // Bug #4 fix: Timer to trigger Action Center at exact grace period expiry
  useEffect(() => {
    if (showActionCenter) return; // Already showing
    if (todaysRituals.length === 0) return;

    // Find last scheduled time from rituals
    const sorted = [...todaysRituals].sort(
      (a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime()
    );
    const lastTime = sorted[0]?.scheduledTime;
    if (!lastTime) return;

    const graceEnd = lastTime.getTime() + 60 * 60 * 1000; // 60 min
    const now = Date.now();
    const msUntilGrace = graceEnd - now;

    if (msUntilGrace <= 0) return; // Already past

    const timer = setTimeout(() => {
      setActionCenterTick(prev => prev + 1);
    }, msUntilGrace);

    return () => clearTimeout(timer);
  }, [todaysRituals, showActionCenter]);

  // Track ActionCenter state for animation transition detection
  useEffect(() => {
    if (showActionCenter) {
      setWasInActionCenter(true);
    }
  }, [showActionCenter]);

  // Phase 6: Fire POST /notifications/day-settled when Action Center first appears
  // (all doses resolved — backend evaluates missed-day notifications)
  // AsyncStorage guard prevents re-firing on HomeScreen remount within the same day
  const daySettledFired = useRef(false);
  useEffect(() => {
    if (!showActionCenter || daySettledFired.current) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `daySettled:${today}`;

    AsyncStorage.getItem(key).then((val) => {
      if (val) {
        daySettledFired.current = true;
        return;
      }
      daySettledFired.current = true;
      AsyncStorage.setItem(key, '1').catch(() => {});
      logEndOfDay(ritualStats.completed, ritualStats.total);
      apiClient
        .request(ENDPOINTS.DAY_SETTLED, {
          method: 'POST',
          body: JSON.stringify({ event_date: today }),
        })
        .catch(() => {}); // non-blocking fire-and-forget
    });
  }, [showActionCenter]);

  // Detect transition from ActionCenter to Victory and trigger animation
  useEffect(() => {
    if (wasInActionCenter && isVictory && !showActionCenter) {
      console.log('[VictoryAnimation] Triggering sync animation');
      setShowVictoryAnimation(true);
      setWasInActionCenter(false);
    }
  }, [wasInActionCenter, isVictory, showActionCenter]);

  // Handler for when victory animation completes
  const handleVictoryAnimationComplete = useCallback(() => {
    console.log('[VictoryAnimation] Animation complete');
    // Animation stays showing - no need to hide it since it ends in victory state
  }, []);

  // Critical Miss detection (for medications with isCritical: true)
  const criticalMissedRitual = useMemo(() => {
    const result = getCriticalMissedRitual(todaysRituals, activeMedications);
    console.log('[CriticalMiss] Recalculating:', {
      ritualsCount: todaysRituals.length,
      missedRituals: todaysRituals.filter(r => r.status === 'missed').map(r => r.name),
      result: result?.name || null,
    });
    return result;
  }, [todaysRituals, activeMedications]);

  // Ref for RitualsCarousel to scroll to critical miss
  const ritualsCarouselRef = useRef<RitualsCarouselRef>(null);

  // Handler to scroll to critical miss in carousel
  const handleCriticalMissPress = useCallback(() => {
    if (criticalMissedRitual) {
      ritualsCarouselRef.current?.scrollToRitual(criticalMissedRitual.id);
    }
  }, [criticalMissedRitual]);

  // Low stock badge: filter active medications below user's threshold
  const thresholdDays = notifPrefs?.low_stock_threshold_days ?? 7;
  const lowStockMeds = useMemo(() => {
    return activeMedications.filter((m) => {
      if (m.is_paused || m.is_archived || m.is_as_needed) return false;
      const dosesPerDay = (m.dose_times && m.dose_times.length > 0)
        ? m.dose_times.length
        : getOccurrenceCount(m.occurrence);
      const threshold = calculateLowStockDoses(m.dose_size, dosesPerDay, thresholdDays);
      return m.current_stock < threshold;
    }).sort((a, b) => a.current_stock - b.current_stock);
  }, [activeMedications, thresholdDays]);

  const openLowStockSheet = useCallback(() => {
    lowStockSheetRef.current?.expand();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  /**
   * Step 40: Gamification wiring after dose logging.
   * D17 Delayed Counter Trick:
   * - Online: Fire XpAnimation with estimate, refresh status for tier-up
   * - Offline: No XP animation, just haptic from chip
   */
  const handleGamificationAfterDose = useCallback(async () => {
    if (!isOnline) {
      // D17 Option A: Offline -- no XP animation, XP catches up on sync
      console.log('[Gamification] Offline -- skipping XP animation');
      return;
    }

    // D17: Estimate XP using client-side calculator
    const estimatedXp = estimateDailyXp(streakDays, comebackBoostActive);
    console.log('[Gamification] Estimated XP:', estimatedXp);

    // Fire XP animation immediately with estimate
    setXpAnimationAmount(estimatedXp);
    setXpAnimationTrigger(true);

    // Reset animation trigger after a short delay
    setTimeout(() => {
      setXpAnimationTrigger(false);
    }, 600);

    // Refresh gamification status (server-authoritative) -- header updates during animation
    const { tierChanged, newTier, showDiscrepancyToast } = await refreshAndDetectTierUp(estimatedXp);

    // D17 Layer 3: XP discrepancy detected — logged as warning in useGamification,
    // no user-facing alert (the header silently updates to the server value)
    if (showDiscrepancyToast) {
      console.log('[Gamification] XP discrepancy > threshold — header updated silently');
    }

    // Tier-up detection
    if (tierChanged) {
      console.log('[Gamification] Tier up detected! New tier:', newTier);
      setCelebrationTier(newTier);
      // Slight delay so XP animation finishes first
      setTimeout(() => {
        setShowTierCelebration(true);
      }, 700);
    }
  }, [isOnline, streakDays, comebackBoostActive, refreshAndDetectTierUp]);

  const handleTakeNow = useCallback(async (): Promise<{
    isFutureDose: boolean;
    dateDisplay?: string;
    partialFailure?: boolean;
    failedCount?: number;
  }> => {
    // Prevent concurrent dose logging
    if (isLoggingDose) {
      console.log('[TakeNow] Already logging, ignoring');
      return { isFutureDose: false };
    }

    console.log('[TakeNow] Button clicked, nextDoseSlot:', nextDoseSlot?.medications.length, 'medications');
    if (nextDoseSlot) {
      // Check if dose is for a future day (not today)
      if (!nextDoseSlot.isTodayDose) {
        console.log('[TakeNow] Dose is for future date:', nextDoseSlot.dateDisplay);
        return { isFutureDose: true, dateDisplay: nextDoseSlot.dateDisplay };
      }

      setIsLoggingDose(true);
      try {
        const doses = nextDoseSlot.medications.map(({ medication }) => ({
          medicationId: medication.id,
          data: {
            scheduled_at: nextDoseSlot.doseTime.toISOString(),
            status: 'taken' as const,
          },
        }));

        console.log('[TakeNow] Logging batch dose for:', doses.length, 'medications');
        const { success, failed } = await logDoseBatch(doses);

        console.log('[TakeNow] Batch result:', success.length, 'success,', failed.length, 'failed');

        // Mark successful doses as taken today using chipIds (supports multi-dose)
        const slotTime = nextDoseSlot.doseTime.getTime();
        const successRituals = todaysRituals.filter((r) => {
          const isSameTime = r.scheduledTime.getTime() === slotTime;
          const medicationFailed = failed.includes(r.medicationId);
          return isSameTime && !medicationFailed;
        });
        const successChipIds = successRituals.map((r) => r.id);

        if (successChipIds.length > 0) {
          setTakenTodayArray((prev) => {
            const newArray = [...prev];
            successChipIds.forEach((chipId) => {
              if (!newArray.includes(chipId)) {
                newArray.push(chipId);
              }
            });
            console.log('[TakeNow] Updated takenTodayArray with chipIds:', newArray);
            return newArray;
          });
          setStateVersion((v) => v + 1);
          await doseStatusCache.markTaken(successChipIds);

          // Track these doses for potential revert (30-minute window) - non-blocking
          try {
            const takenAt = new Date();
            const newRevertables: RevertableDose[] = [];
            for (const ritual of successRituals) {
              const matchingDose = success.find((d) => d.medication_id === ritual.medicationId);
              if (matchingDose?.id) {
                const entry: RevertableDose = {
                  chipId: ritual.id,
                  doseId: matchingDose.id,
                  medicationId: ritual.medicationId,
                  takenAt,
                };
                newRevertables.push(entry);
                await doseStatusCache.addRevertableDose(entry);
              }
            }
            if (newRevertables.length > 0) {
              setRevertableDoses((prev) => [...prev, ...newRevertables]);
              console.log('[TakeNow] Added to revertableDoses:', newRevertables.length, 'doses');
            }
          } catch (revertTrackError) {
            console.warn('[TakeNow] Failed to track for revert:', revertTrackError);
          }

          // Step 40: Trigger gamification flow after successful dose
          handleGamificationAfterDose();

          // Show peppy dose toast with all medication names
          const names = successRituals.map((r) => r.name);
          const batchLabel = names.length <= 2
            ? names.join(' & ')
            : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
          const msg = getRandomDoseMessage(batchLabel);
          setDoseToast({ visible: true, title: msg.title, body: msg.body });
        }

        if (failed.length > 0) {
          return { isFutureDose: false, partialFailure: true, failedCount: failed.length };
        }

        return { isFutureDose: false };
      } catch (error) {
        console.error('[TakeNow] Failed to log dose batch:', error);
      } finally {
        setIsLoggingDose(false);
      }
    } else {
      console.log('[TakeNow] No nextDoseSlot available');
    }
    return { isFutureDose: false };
  }, [nextDoseSlot, todaysRituals, logDoseBatch, isLoggingDose, handleGamificationAfterDose]);

  // Handler for taking a single dose from RitualsCarousel
  const handleTakeSingleDose = useCallback(
    async (chipId: string, medicationId: string): Promise<boolean> => {
      if (isLoggingDose) {
        console.log('[TakeSingleDose] Already logging, ignoring');
        return false;
      }

      const medication = activeMedications.find((m) => m.id === medicationId);
      if (!medication) {
        console.log('[TakeSingleDose] Medication not found:', medicationId);
        return false;
      }

      const ritual = todaysRituals.find((r) => r.id === chipId);

      setIsLoggingDose(true);
      try {
        const scheduledTime = ritual?.scheduledTime || new Date();
        if (!ritual) {
          scheduledTime.setHours(
            parseInt(medication.time_of_day.split(':')[0], 10),
            parseInt(medication.time_of_day.split(':')[1], 10),
            0,
            0
          );
        }

        console.log('[TakeSingleDose] Logging dose for:', medication.name, 'chipId:', chipId, 'is_critical:', medication.is_critical);
        const doseLog = await logDose(medicationId, {
          scheduled_at: scheduledTime.toISOString(),
          status: 'taken',
        });

        console.log('[TakeSingleDose] Updating takenTodayArray with chipId:', chipId);
        setTakenTodayArray((prev) => {
          if (prev.includes(chipId)) {
            console.log('[TakeSingleDose] Already in array, no change');
            return prev;
          }
          const newArray = [...prev, chipId];
          console.log('[TakeSingleDose] New takenTodayArray:', newArray);
          return newArray;
        });
        setStateVersion((v) => {
          console.log('[TakeSingleDose] Incrementing stateVersion to:', v + 1);
          return v + 1;
        });

        await doseStatusCache.markTaken([chipId]);

        // Track this dose for potential revert (30-minute window) - non-blocking
        try {
          if (doseLog?.id) {
            const revertableEntry: RevertableDose = {
              chipId,
              doseId: doseLog.id,
              medicationId,
              takenAt: new Date(),
            };
            setRevertableDoses((prev) => [...prev, revertableEntry]);
            await doseStatusCache.addRevertableDose(revertableEntry);
            console.log('[TakeSingleDose] Added to revertableDoses:', chipId);
          }
        } catch (revertTrackError) {
          console.warn('[TakeSingleDose] Failed to track for revert:', revertTrackError);
        }

        // Step 40: Trigger gamification flow after successful dose
        handleGamificationAfterDose();

        // Show peppy dose toast
        const msg = getRandomDoseMessage(medication.name);
        setDoseToast({ visible: true, title: msg.title, body: msg.body });

        return true;
      } catch (error) {
        console.error('[TakeSingleDose] Failed to log dose:', error);
        return false;
      } finally {
        setIsLoggingDose(false);
      }
    },
    [activeMedications, todaysRituals, logDose, isLoggingDose, handleGamificationAfterDose]
  );

  // Handler for logging missed doses from ActionCenterCard
  const handleLogMissedDose = useCallback(
    async (chipId: string): Promise<boolean> => {
      if (isLoggingDose) {
        console.log('[LogMissedDose] Already logging, ignoring');
        return false;
      }

      const missedRitual = todaysRituals.find((r) => r.id === chipId);
      if (!missedRitual) {
        console.log('[LogMissedDose] Ritual not found for chipId:', chipId);
        return false;
      }

      const medicationId = missedRitual.medicationId;
      const medication = activeMedications.find((m) => m.id === medicationId);
      if (!medication) {
        console.log('[LogMissedDose] Medication not found:', medicationId);
        return false;
      }

      setIsLoggingDose(true);
      try {
        const scheduledTime = missedRitual.scheduledTime;

        console.log('[LogMissedDose] Logging missed dose for:', medication.name, 'chipId:', chipId);
        await logDose(medicationId, {
          scheduled_at: scheduledTime.toISOString(),
          status: 'taken',
        });

        setTakenTodayArray((prev) => {
          if (prev.includes(chipId)) {
            return prev;
          }
          const newArray = [...prev, chipId];
          console.log('[LogMissedDose] Updated takenTodayArray:', newArray);
          return newArray;
        });
        setStateVersion((v) => v + 1);
        await doseStatusCache.markTaken([chipId]);

        // Step 40: Trigger gamification flow after missed dose recovery
        handleGamificationAfterDose();

        return true;
      } catch (error) {
        console.error('[LogMissedDose] Failed to log dose:', error);
        return false;
      } finally {
        setIsLoggingDose(false);
      }
    },
    [activeMedications, todaysRituals, logDose, isLoggingDose, handleGamificationAfterDose]
  );

  // Check if a chip can be reverted (within 30-minute window)
  const canRevertChip = useCallback(
    (chipId: string): boolean => {
      const revertable = revertableDoses.find((r) => r.chipId === chipId);
      if (!revertable) return false;
      return canRevertDose(revertable.takenAt);
    },
    [revertableDoses]
  );

  // Handler for reverting (undoing) a dose
  const handleRevertDose = useCallback(
    async (chipId: string): Promise<{ success: boolean; error?: string }> => {
      if (isLoggingDose) {
        console.log('[RevertDose] Already processing, ignoring');
        return { success: false, error: 'Please wait' };
      }

      const revertable = revertableDoses.find((r) => r.chipId === chipId);
      if (!revertable) {
        console.log('[RevertDose] No revertable entry for chipId:', chipId);
        return { success: false, error: 'Cannot undo this dose' };
      }

      if (!canRevertDose(revertable.takenAt)) {
        console.log('[RevertDose] Window expired for chipId:', chipId);
        setRevertableDoses((prev) => prev.filter((r) => r.chipId !== chipId));
        await doseStatusCache.removeRevertableDose(chipId);
        return { success: false, error: 'Undo window expired (30 minutes)' };
      }

      const medication = activeMedications.find((m) => m.id === revertable.medicationId);
      const doseSize = medication?.dose_size || 1;

      setIsLoggingDose(true);
      try {
        console.log('[RevertDose] Reverting dose:', chipId, 'doseId:', revertable.doseId);
        const result = await revertDose(revertable.medicationId, revertable.doseId, doseSize);

        if (result.success) {
          setRevertableDoses((prev) => prev.filter((r) => r.chipId !== chipId));
          await doseStatusCache.removeRevertableDose(chipId);
          setTakenTodayArray((prev) => prev.filter((id) => id !== chipId));
          setStateVersion((v) => v + 1);
          await doseStatusCache.markReverted(chipId);

          // Refresh gamification after revert (XP rollback may have occurred)
          refreshStatus();

          console.log('[RevertDose] Successfully reverted chipId:', chipId);
          return { success: true };
        } else {
          console.log('[RevertDose] Failed:', result.error);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('[RevertDose] Error:', error);
        return { success: false, error: 'Unable to undo dose' };
      } finally {
        setIsLoggingDose(false);
      }
    },
    [revertableDoses, activeMedications, revertDose, isLoggingDose, refreshStatus]
  );

  // Step 40: Waiver prompt handlers
  const handleWaiverBadgeUsed = useCallback(() => {
    setPendingModal('none');
    setWaiverJustUsed(true);
    refreshStatus();
  }, [refreshStatus]);

  const handleWaiverDismiss = useCallback(() => {
    setPendingModal('none');
  }, []);

  // Phase 7: WelcomeBack dismiss — chain to waiver if conditions met
  const handleWelcomeBackDismiss = useCallback(() => {
    // After dismissing boost modal, check if waiver should show next
    if (hasMissedYesterday && waiverBadges > 0 && !waiverCheckedRef.current) {
      waiverCheckedRef.current = true;
      setPendingModal('waiver');
    } else {
      setPendingModal('none');
    }
  }, [hasMissedYesterday, waiverBadges]);

  // Waiver icon tap handler (GamificationHeader)
  const handleWaiverIconPress = useCallback(() => {
    if (hasMissedYesterday && waiverBadges > 0) {
      setPendingModal('waiver');
    } else if (waiverBadges === 0) {
      showAlert({ title: 'No Waiver Badges', message: 'No waiver badges remaining. Earn more by reaching higher tiers.', type: 'info', iconColor: colors.chartAccent });
    } else {
      showAlert({ title: 'Streak Safe', message: 'No missed doses in the last 3 days to waive.', type: 'info', iconColor: colors.chartAccent });
    }
  }, [hasMissedYesterday, waiverBadges, showAlert, colors.chartAccent]);

  // Step 36: Tier celebration complete handler
  const handleTierCelebrationComplete = useCallback(() => {
    setShowTierCelebration(false);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.bg }]}
      edges={['top']}
      onLayout={() => {
        setRootLayoutDone(true);
      }}
    >
      {showVerificationBanner && (
        <EmailVerificationBanner
          onVerifyNow={handleVerifyNow}
          onDismiss={handleDismissBanner}
          isEscalated={showEscalatedBanner}
          hoursRemaining={hoursRemaining}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Vision</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>{today}</Text>
          </View>
          <View style={styles.headerRight}>
            <LowStockBadge count={lowStockMeds.length} onPress={openLowStockSheet} />
            <TouchableOpacity
              ref={tierBadgeRef as any}
              style={styles.tierBadgeBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MyJourney')}
              accessibilityLabel={`${TIER_NAMES[currentTier] ?? 'Observer'} tier. Tap to view your journey.`}
            >
              <Image source={getTierAsset(currentTier, isDark)} style={styles.tierBadgeImg} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gamification status bar (self-contained -- isolated re-renders R5.3) */}
        <View
          style={styles.gamificationHeaderWrap}
          onLayout={(e) => {
            measureElement(e.target, (x: number, y: number, w: number, h: number) => {
              if (w > 0 && h > 0) setTargetRect(2, { x, y, width: w, height: h });
            });
          }}
        >
          <GamificationHeader />
          {/* Step 35: XP Animation floats above the header */}
          <XpAnimation
            xpAmount={xpAnimationAmount}
            trigger={xpAnimationTrigger}
            isBoosted={comebackBoostActive && !hasShownBoostLabel}
            onComplete={() => {
              setXpAnimationTrigger(false);
              setHasShownBoostLabel(true);
            }}
          />
        </View>

        {/* Bento layout */}
        <View style={styles.grid}>
          {showActionCenter && oldestMissedRitual ? (
            <ActionCenterCard
              missedRitual={oldestMissedRitual}
              insightText={actionCenterInsight}
              completedCount={ritualStats.completed}
              totalCount={ritualStats.total}
              tomorrowSlot={tomorrowSlot}
              onLogMissedDose={handleLogMissedDose}
            />
          ) : isVictory ? (
            showVictoryAnimation ? (
              <VictorySyncAnimation
                isTriggered={true}
                points={victoryPoints}
                insightText={victoryInsight}
                tomorrowSlot={tomorrowSlot}
                completedCount={ritualStats.completed}
                totalCount={ritualStats.total}
                onAnimationComplete={handleVictoryAnimationComplete}
              />
            ) : (
              <VictoryCard
                points={victoryPoints}
                insightText={victoryInsight}
                tomorrowSlot={tomorrowSlot}
                completedCount={ritualStats.completed}
                totalCount={ritualStats.total}
                comebackBoostActive={comebackBoostActive}
                boostHoursRemaining={comebackBoostUntil
                  ? Math.max(0, Math.floor((new Date(comebackBoostUntil).getTime() - Date.now()) / 3600000))
                  : 0}
              />
            )
          ) : (
            <HeroSection
              medications={nextDoseSlot?.medications.map(({ medication, mealInfo, doseInfo }) => ({
                id: medication.id,
                name: medication.name,
                mealInfo,
                doseInfo,
                doseSize: medication.dose_size,
              }))}
              scheduledTime={nextDoseSlot?.timeDisplay || '--'}
              dateDisplay={nextDoseSlot?.dateDisplay}
              isTodayDose={nextDoseSlot?.isTodayDose ?? true}
              hasNextDose={!!nextDoseSlot}
              onTakeNow={handleTakeNow}
              disabled={isLoggingDose}
              criticalMissedRitual={criticalMissedRitual}
              onCriticalMissPress={handleCriticalMissPress}
            />
          )}
          {/* Hide rituals carousel when all rituals are complete - show vitality score instead */}
          {!allRitualsComplete && (
            <RitualsCarousel
              ref={ritualsCarouselRef}
              rituals={todaysRituals}
              onTakeDose={handleTakeSingleDose}
              onRevertDose={handleRevertDose}
              canRevertChip={canRevertChip}
              disabled={isLoggingDose}
            />
          )}
          <View ref={adherenceCardRef}>
            <AdherenceCard
              streakDays={streakDays}
              currentTier={currentTier}
              waiverBadges={waiverBadges}
              waiverJustUsed={waiverJustUsed}
              onWaiverPress={handleWaiverIconPress}
            />
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <View
        style={styles.fab}
        onLayout={(e) => {
          measureElement(e.target, (x: number, y: number, w: number, h: number) => {
            if (w > 0 && h > 0) setTargetRect(1, { x, y, width: w, height: h });
          });
        }}
      >
        <AnimatedPressable
          style={[styles.fabInner, { backgroundColor: colors.cyan, shadowColor: colors.cyan }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AddMedication')}
        >
          <Plus color={colors.bg} size={24} strokeWidth={2.5} />
        </AnimatedPressable>
      </View>

      {/* Post-tour hint: journey icon */}
      {activeHint === 'H2' && tierBadgeRect && (
        <SpotlightHint
          targetRect={tierBadgeRect}
          title="See Your Progress"
          message="Every dose you take earns XP and builds your streak. Tap here to see how consistent you've been."
          onDismiss={() => dismissHint('H2')}
        />
      )}
      {activeHint === 'H7' && adherenceCardRect && (
        <SpotlightHint
          targetRect={adherenceCardRect}
          title="You Earned This"
          message="Your consistency unlocked the monthly calendar. Tap to see how far you've come."
          onDismiss={() => dismissHint('H7')}
        />
      )}

      {/* Step 36: Tier Celebration overlay */}
      <TierCelebration
        visible={showTierCelebration}
        newTier={celebrationTier}
        onComplete={handleTierCelebrationComplete}
      />

      {/* Phase 7: WelcomeBack modal (priority 1) */}
      <WelcomeBackModal
        visible={showWelcomeBack}
        boostHoursRemaining={comebackBoostUntil
          ? Math.max(0, Math.floor((new Date(comebackBoostUntil).getTime() - Date.now()) / 3600000))
          : 0}
        onDismiss={handleWelcomeBackDismiss}
      />

      {/* Step 40: Waiver Prompt on app open (priority 2) */}
      <WaiverPrompt
        visible={showWaiverPrompt}
        waiverBadges={waiverBadges}
        streakDays={streakDays}
        onBadgeUsed={handleWaiverBadgeUsed}
        onDismiss={handleWaiverDismiss}
      />
      <DoseToast
        visible={doseToast.visible}
        title={doseToast.title}
        body={doseToast.body}
        onDismiss={() => setDoseToast((prev) => ({ ...prev, visible: false }))}
      />
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />

      {/* Low Stock Bottom Sheet — outside ScrollView to overlay correctly */}
      <LowStockBottomSheet
        ref={lowStockSheetRef}
        medications={lowStockMeds}
        thresholdDays={thresholdDays}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  date: { ...typography.bodySmall, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadgeBtn: { alignItems: 'center', gap: 4 },
  tierBadgeImg: { width: 68, height: 68 },
  gamificationHeaderWrap: { position: 'relative', marginBottom: 16 },
  grid: { gap: 16 },
  fab: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    width: 56,
    height: 56,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
