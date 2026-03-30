/**
 * useSubscription — single source of truth for subscription state in the UI.
 *
 * When EXPO_PUBLIC_SUBSCRIPTION_ENABLED is false:
 *   hasActiveSubscription = true, isPremium = true, isFree = false, loading = false
 *   → app behaves identically to pre-subscription era.
 *
 * Source of truth:
 *   - Gate decisions: RevenueCat SDK (local cache, zero latency)
 *   - UI display: profile.subscription_status from auth context
 *   - Offline fallback: profile.subscription_status when RC SDK unavailable
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import {
  subscriptionService,
  type CustomerInfo,
  type SubscriptionPackage,
} from '../../data/services/subscriptionService';
import type { SubscriptionStatus } from '../../domain/types';

const SUBSCRIPTION_ENABLED = process.env.EXPO_PUBLIC_SUBSCRIPTION_ENABLED === 'true';

interface UseSubscriptionReturn {
  /** Whether user has any active subscription (trial, paid, grandfathered). */
  hasActiveSubscription: boolean;
  /** User is on a paid or grandfathered plan. */
  isPremium: boolean;
  /** User is on free tier (expired trial, no subscription). */
  isFree: boolean;
  /** User is currently in trial period. */
  isInTrial: boolean;
  /** Days remaining in trial (null if not in trial). */
  trialDaysLeft: number | null;
  /** Raw subscription status from backend profile. */
  subscriptionStatus: SubscriptionStatus;
  /** Remaining AI scan credits. */
  aiScanCredits: number;
  /** Total XP (from profile, for tier-crossing UI). */
  totalXp: number;
  /** Current tier (from profile). */
  currentTier: number;
  /** Whether the subscription feature is enabled. */
  subscriptionEnabled: boolean;
  /** Loading state — true until RC SDK init completes. */
  loading: boolean;
  /** Error message if something went wrong. */
  error: string | null;
  /** Subscribe to a package. */
  subscribe: (pkg: SubscriptionPackage) => Promise<boolean>;
  /** Restore previous purchases. */
  restore: () => Promise<boolean>;
  /** Check if win-back modal should be shown. */
  shouldShowWinBackModal: () => Promise<{ show: boolean; xpAccumulated: number; tier: number }>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { profile, refreshProfile } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(SUBSCRIPTION_ENABLED);
  const [error, setError] = useState<string | null>(null);

  // Initialize and fetch customer info
  useEffect(() => {
    if (!SUBSCRIPTION_ENABLED) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        await subscriptionService.initialize();
        const info = await subscriptionService.getCustomerInfo();
        if (mounted) setCustomerInfo(info);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Subscription init failed');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Derive subscription status from profile (treat undefined/missing as "none")
  const subscriptionStatus: SubscriptionStatus = profile?.subscription_status ?? 'none';
  const aiScanCredits = profile?.ai_scan_credits ?? 2;
  const totalXp = profile?.total_xp ?? 0;
  const currentTier = profile?.current_tier ?? 1;

  // Gate decision: RC SDK is primary, profile is fallback
  const hasActiveSubscription = useMemo(() => {
    if (!SUBSCRIPTION_ENABLED) return true;
    if (customerInfo) return customerInfo.hasActiveSubscription;
    // Offline fallback: trust profile status
    return ['trial', 'active', 'grace_period'].includes(subscriptionStatus) ||
      (subscriptionStatus === 'cancelled' &&
        !!profile?.subscription_expires_at &&
        new Date(profile.subscription_expires_at) > new Date());
  }, [customerInfo, subscriptionStatus, profile?.subscription_expires_at]);

  const isInTrial = useMemo(() => {
    if (!SUBSCRIPTION_ENABLED) return false;
    if (customerInfo) return customerInfo.isInTrial;
    return subscriptionStatus === 'trial';
  }, [customerInfo, subscriptionStatus]);

  const isPremium = hasActiveSubscription && !isInTrial;
  const isFree = !hasActiveSubscription;

  // Trial days left
  const trialDaysLeft = useMemo(() => {
    if (!isInTrial || !profile?.subscription_expires_at) return null;
    const diff = new Date(profile.subscription_expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isInTrial, profile?.subscription_expires_at]);

  const subscribe = useCallback(async (pkg: SubscriptionPackage): Promise<boolean> => {
    try {
      const info = await subscriptionService.purchasePackage(pkg);
      setCustomerInfo(info);
      // OI-2: Refresh profile so subscription_status, trialDaysLeft, aiScanCredits are current
      refreshProfile().catch(() => {});
      return info.hasActiveSubscription;
    } catch (e: any) {
      setError(e.message || 'Purchase failed');
      return false;
    }
  }, [refreshProfile]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await subscriptionService.restorePurchases();
      setCustomerInfo(info);
      // OI-2: Refresh profile so subscription_status, trialDaysLeft, aiScanCredits are current
      refreshProfile().catch(() => {});
      return info.hasActiveSubscription;
    } catch (e: any) {
      setError(e.message || 'Restore failed');
      return false;
    }
  }, [refreshProfile]);

  const shouldShowWinBackModal = useCallback(async () => {
    const result = { show: false, xpAccumulated: totalXp, tier: currentTier };
    if (!SUBSCRIPTION_ENABLED || hasActiveSubscription) return result;

    // Check if already shown
    const shown = await AsyncStorage.getItem('@vitalic:win_back_shown');
    if (shown === 'true') return result;

    // Check 14 days since trial end
    if (!profile?.trial_started_at) return result;
    const trialStart = new Date(profile.trial_started_at);
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysSinceEnd = (Date.now() - trialEnd.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceEnd >= 14) {
      result.show = true;
    }
    return result;
  }, [hasActiveSubscription, profile?.trial_started_at, totalXp, currentTier]);

  return {
    hasActiveSubscription,
    isPremium,
    isFree,
    isInTrial,
    trialDaysLeft,
    subscriptionStatus,
    aiScanCredits,
    totalXp,
    currentTier,
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
    loading,
    error,
    subscribe,
    restore,
    shouldShowWinBackModal,
  };
}
