import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import type { GamificationStatus } from '../../domain/types';
import { gamificationService } from '../../data/services/gamificationService';
import { offlineCache } from '../../data/utils/offlineCache';
import { medicationEvents } from '../../data/utils/medicationEvents';
import { createLogger } from '../../utils/logger';
import { logTierUp } from '../../data/utils/notificationDebugLog';

const logger = createLogger('useGamification');
const CACHE_KEY = 'gamification_status';

/**
 * XP discrepancy tolerance threshold (D17 Layer 3).
 * If the discrepancy between estimated and server XP is > this value,
 * a toast is shown. Otherwise, the header silently updates.
 */
const XP_DISCREPANCY_THRESHOLD = 5;

/**
 * useGamification -- single source of truth for XP/tier/streak on the frontend.
 *
 * Fetches gamification status on mount via gamificationService.getStatus().
 * Caches via offlineCache (AsyncStorage) for offline fallback.
 * Exposes refreshStatus() for re-fetch after dose log or revert.
 *
 * Step 38: Tracks `isOnline` based on last fetch success/failure.
 * Step 40: Tracks `previousTier` for tier-up detection.
 *
 * IMPORTANT: This hook owns all gamification state. Do NOT read XP/tier/streak
 * from useAuth -- those fields on Profile are display-only defaults for dev mode.
 *
 * Uses React Context so all consumers share one state instance.
 * Wrap the app with <GamificationContext.Provider value={useGamificationProvider()}>.
 */

type GamificationContextType = ReturnType<typeof useGamificationProvider>;

export const GamificationContext = createContext<GamificationContextType | null>(null);

export function useGamificationProvider() {
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Step 40: Track previous tier for tier-up detection
  const previousTierRef = useRef<number>(1);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gamificationService.getStatus();
      setStatus(data);
      setError(null);
      setIsOnline(true);
      // Cache for offline fallback
      offlineCache.set(CACHE_KEY, data);
      // Update previous tier ref on initial fetch
      previousTierRef.current = data.current_tier;
      logger.debug('Gamification status fetched', {
        totalXp: data.total_xp,
        tier: data.current_tier,
        streak: data.streak_days,
      });
      // Activity log: tier-up only (see refreshAndDetectTierUp)
    } catch (err) {
      setIsOnline(false);
      // Try loading from cache on network failure
      const cached = await offlineCache.get<GamificationStatus>(CACHE_KEY);
      if (cached) {
        setStatus(cached);
        setError(null);
        logger.info('Using cached gamification status');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch gamification status');
        logger.error('Failed to fetch gamification status', err instanceof Error ? err : undefined);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Listen for all_data_deleted event to reset gamification state
  useEffect(() => {
    return medicationEvents.on('all_data_deleted', () => {
      setStatus(null);
      offlineCache.set(CACHE_KEY, null);
      previousTierRef.current = 1;
      fetchStatus();
    });
  }, [fetchStatus]);

  /**
   * refreshStatus -- call after dose log, dose revert, or waiver activation
   * to get the latest server-authoritative gamification state.
   */
  const refreshStatus = useCallback(async () => {
    try {
      const data = await gamificationService.getStatus();
      setStatus(data);
      setError(null);
      setIsOnline(true);
      offlineCache.set(CACHE_KEY, data);
      logger.debug('Gamification status refreshed', {
        totalXp: data.total_xp,
        tier: data.current_tier,
        streak: data.streak_days,
      });
      // Activity log: tier-up only (see refreshAndDetectTierUp)
    } catch (err) {
      setIsOnline(false);
      // On refresh failure, keep existing state -- don't overwrite with error
      logger.warn('Failed to refresh gamification status (keeping stale data)', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  /**
   * Step 40: refreshAndDetectTierUp -- refresh gamification status and
   * detect if a tier-up occurred.
   *
   * Returns { tierChanged: boolean, newTier: number, xpDiscrepancy: number }
   * where xpDiscrepancy is the difference between estimated and actual XP.
   */
  const refreshAndDetectTierUp = useCallback(async (estimatedXp?: number): Promise<{
    tierChanged: boolean;
    newTier: number;
    xpDiscrepancy: number;
    showDiscrepancyToast: boolean;
  }> => {
    const prevTier = previousTierRef.current;
    const prevTotalXp = status?.total_xp ?? 0;
    let tierChanged = false;
    let newTier = prevTier;
    let xpDiscrepancy = 0;
    let showDiscrepancyToast = false;

    try {
      const data = await gamificationService.getStatus();
      setStatus(data);
      setError(null);
      setIsOnline(true);
      offlineCache.set(CACHE_KEY, data);

      newTier = data.current_tier;
      tierChanged = data.current_tier > prevTier;
      previousTierRef.current = data.current_tier;
      if (tierChanged) {
        logTierUp(data.current_tier, data.tier_name, data.total_xp);
      }

      // D17 Layer 3: Tolerance threshold check
      if (estimatedXp !== undefined) {
        const actualXpAwarded = data.total_xp - prevTotalXp;
        xpDiscrepancy = Math.abs(actualXpAwarded - estimatedXp);
        showDiscrepancyToast = xpDiscrepancy > XP_DISCREPANCY_THRESHOLD;
        if (showDiscrepancyToast) {
          // XP discrepancy — logger.warn below handles this
          logger.warn('XP discrepancy detected', {
            estimated: estimatedXp,
            actual: actualXpAwarded,
            discrepancy: xpDiscrepancy,
          });
        }
      }

      logger.debug('Gamification status refreshed (tier-up check)', {
        prevTier,
        newTier: data.current_tier,
        tierChanged,
      });
    } catch (err) {
      setIsOnline(false);
      logger.warn('Failed to refresh for tier-up detection', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    return { tierChanged, newTier, xpDiscrepancy, showDiscrepancyToast };
  }, [status]);

  // Derived convenience values (avoids status?.field everywhere in consumers)
  const totalXp = status?.total_xp ?? 0;
  const currentTier = status?.current_tier ?? 1;
  const tierName = status?.tier_name ?? 'Observer';
  const streakDays = status?.streak_days ?? 0;
  const streakStartDate = status?.streak_start_date ?? null;
  const waiverBadges = status?.waiver_badges ?? 0;
  const comebackBoostActive = status?.comeback_boost_active ?? false;
  const comebackBoostHoursLeft = status?.comeback_boost_hours_left ?? null;
  const comebackBoostUntil = status?.comeback_boost_until ?? null;
  const xpToNextTier = status?.xp_to_next_tier ?? null;
  const nextTierName = status?.next_tier_name ?? null;
  const hasMissedYesterday = status?.has_missed_yesterday ?? false;
  const perfectMonthsStreak = status?.perfect_months_streak ?? 0;
  const timezoneMissing = status?.timezone_missing ?? false;

  return {
    // Raw status object (for consumers that need the full shape)
    status,

    // Loading & error state
    loading,
    error,

    // Step 38: Online/offline state
    isOnline,

    // Derived convenience values
    totalXp,
    currentTier,
    tierName,
    streakDays,
    streakStartDate,
    waiverBadges,
    comebackBoostActive,
    comebackBoostHoursLeft,
    comebackBoostUntil,
    xpToNextTier,
    nextTierName,
    hasMissedYesterday,
    perfectMonthsStreak,
    timezoneMissing,

    // Actions
    refreshStatus,
    fetchStatus,
    refreshAndDetectTierUp,
  };
}

export function useGamification(): GamificationContextType {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
