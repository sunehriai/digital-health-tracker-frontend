/**
 * MyJourneyScreen -- Vertical tier progression path.
 *
 * Displays all 5 tiers from top (Tier 5) to bottom (Tier 1).
 * Unlocked = full color badge, Locked = greyed + lock overlay,
 * Current = highlighted with cyan glow. Tap locked tier to expand preview.
 *
 * Monthly Milestones moved to MyAdherenceScreen (contextually relevant there).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Star } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGamification } from '../hooks/useGamification';
import { useSubscription } from '../hooks/useSubscription';
import { gamificationService } from '../../data/services/gamificationService';
import { TIER_ASSETS, TIER_NAMES, TIER_THRESHOLDS, getTierAsset } from '../../domain/constants/tierAssets';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import type { TierInfo } from '../../domain/types';

const TIER_FEATURES: Record<number, string> = {
  1: 'Dashboard, medication logging, Emergency Vault',
  2: 'Monthly Adherence Calendar, Waiver Badge',
  3: 'Insight Trends, Waiver Badge',
  4: 'Coming Soon',
  5: 'Coming Soon',
};

const TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'Your starting point. Track medications, build your daily ritual, and access your Emergency Vault — your safety-critical health info, always accessible.',
  2: 'Tap to view your monthly adherence heat map. See your streaks, milestone stickers, and month-in-review insights.',
  3: 'Explore Insight Trends to visualize adherence patterns and discover deeper health insights.',
  4: 'More features coming soon.',
  5: 'More features coming soon.',
};

export default function MyJourneyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { totalXp, currentTier, loading: statusLoading } = useGamification();
  const { isInTrial, subscriptionEnabled, trialDaysLeft } = useSubscription();
  const { colors, isDark } = useTheme();
  const [journeyTiers, setJourneyTiers] = useState<TierInfo[] | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [selectedLockedTier, setSelectedLockedTier] = useState<number | null>(null);

  const fetchJourney = useCallback(async () => {
    setJourneyLoading(true);
    try {
      const data = await gamificationService.getJourney();
      // BP-011: Override backend feature_unlock with frontend-authoritative text
      const correctedTiers = data.tiers.map((tier: TierInfo) => ({
        ...tier,
        feature_unlock: TIER_FEATURES[tier.tier] ?? tier.feature_unlock,
      }));
      setJourneyTiers(correctedTiers);
    } catch {
      const fallback: TierInfo[] = [1, 2, 3, 4, 5].map((tier) => ({
        tier,
        name: TIER_NAMES[tier] ?? `Tier ${tier}`,
        xp_threshold: TIER_THRESHOLDS[tier] ?? 0,
        feature_unlock: TIER_FEATURES[tier] ?? null,
        is_unlocked: tier <= currentTier,
        is_current: tier === currentTier,
        xp_to_unlock: tier <= currentTier ? null : (TIER_THRESHOLDS[tier] ?? 0) - totalXp,
      }));
      setJourneyTiers(fallback);
    } finally {
      setJourneyLoading(false);
    }
  }, [currentTier, totalXp]);

  useEffect(() => { fetchJourney(); }, [fetchJourney]);

  const loading = statusLoading || journeyLoading;
  const displayTiers = journeyTiers ? [...journeyTiers].reverse() : [];

  // Step 45: During trial, all tiers are visible as an aspirational roadmap
  const isTrialPreview = isInTrial && subscriptionEnabled;

  const handleTierPress = (tier: TierInfo) => {
    // Step 45: Trial users can navigate to all feature screens as preview
    if (isTrialPreview && !tier.is_unlocked) {
      if (tier.tier === 2) {
        navigation.navigate('MyAdherence');
        return;
      } else if (tier.tier === 3) {
        navigation.navigate('MainTabs', { screen: 'Insights', params: { fromScreen: 'MyJourney' } } as any);
        return;
      }
      // Tiers 4/5 — expand preview info
      setSelectedLockedTier(selectedLockedTier === tier.tier ? null : tier.tier);
      return;
    }
    if (!tier.is_unlocked) {
      setSelectedLockedTier(selectedLockedTier === tier.tier ? null : tier.tier);
    } else if (tier.tier === 1) {
      navigation.navigate('EmergencyVault');
    } else if (tier.tier === 2) {
      navigation.navigate('MyAdherence');
    } else if (tier.tier === 3) {
      navigation.navigate('MainTabs', { screen: 'Insights', params: { fromScreen: 'MyJourney' } } as any);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft color={colors.textSecondary} size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Journey</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.xpSummary, { borderBottomColor: colors.border }]}>
        <View style={styles.xpRow}>
          <View style={styles.xpTextCol}>
            <Text style={[styles.xpTotal, { color: colors.cyan }]}>{totalXp.toLocaleString()} XP</Text>
            <Text style={[styles.xpSummaryLabel, { color: colors.textMuted }]}>
              {TIER_NAMES[currentTier] ?? 'Observer'} — Tier {currentTier}
            </Text>
          </View>
          <Image source={getTierAsset(currentTier, isDark)} style={styles.xpTierBadge} resizeMode="contain" />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Step 45: Trial preview banner */}
          {isTrialPreview && (
            <View style={[styles.trialBanner, { backgroundColor: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
              <Text style={[styles.trialBannerTitle, { color: colors.cyan }]}>
                Trial Preview
              </Text>
              <Text style={[styles.trialBannerText, { color: colors.textSecondary }]}>
                Explore all tiers during your trial. Tap any tier to preview its features.
                {trialDaysLeft !== null ? ` ${trialDaysLeft} days left.` : ''}
              </Text>
            </View>
          )}

          {/* Tier Progression Path */}
          {displayTiers.map((tier, index) => {
            const isUnlocked = tier.is_unlocked || isTrialPreview;
            const isCurrent = tier.is_current;
            const isExpanded = selectedLockedTier === tier.tier;

            return (
              <View key={tier.tier}>
                {index > 0 && (
                  <View style={styles.connectorContainer}>
                    <View style={[styles.connectorLine, { backgroundColor: colors.border }, isUnlocked && { backgroundColor: colors.cyanGlow }]} />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.tierCard, { backgroundColor: isDark ? colors.bgCard : colors.bgElevated, borderColor: colors.border }, isUnlocked && [styles.tierCardUnlocked, { borderColor: isDark ? colors.cyanDim : colors.border }], isCurrent && [styles.tierCardCurrent, { borderColor: colors.cyan, shadowColor: colors.cyan }]]}
                  activeOpacity={isUnlocked ? 1 : 0.7}
                  onPress={() => handleTierPress(tier)}
                >
                  <View style={styles.tierRow}>
                    <View style={styles.badgeWrap}>
                      <Image
                        source={getTierAsset(tier.tier, isDark)}
                        style={[styles.badgeImage, !isUnlocked && styles.badgeImageLocked]}
                        resizeMode="contain"
                      />
                      {!isUnlocked && (
                        <View style={[styles.lockOverlay, { backgroundColor: colors.bg }]}>
                          <Lock color="#FFD700" size={14} strokeWidth={2.5} />
                        </View>
                      )}
                    </View>

                    <View style={styles.tierInfo}>
                      <View style={styles.tierNameRow}>
                        <Text style={[styles.tierName, { color: colors.textMuted }, isUnlocked && { color: colors.textPrimary }, isCurrent && { color: colors.cyan }]}>
                          {tier.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: colors.cyanDim }]}>
                            <Star color={colors.cyan} size={9} strokeWidth={2.5} fill={colors.cyan} />
                            <Text style={[styles.currentBadgeText, { color: colors.cyan }]}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tierThreshold, { color: colors.textMuted }]}>{tier.xp_threshold.toLocaleString()} XP</Text>
                      {tier.feature_unlock && (
                        <Text style={[styles.tierFeature, { color: colors.textSecondary }]}>
                          {tier.is_unlocked ? 'Unlocked: ' : (isTrialPreview ? 'Preview: ' : 'Unlocks: ')}{tier.feature_unlock}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isExpanded && !isUnlocked && (
                    <View style={[styles.expandedPreview, { borderTopColor: colors.bgSubtle }]}>
                      <Text style={[styles.previewDesc, { color: colors.textSecondary }]}>{TIER_DESCRIPTIONS[tier.tier] ?? ''}</Text>
                      <View style={styles.previewXpRow}>
                        <Text style={[styles.previewXpValue, { color: colors.cyan }]}>{(tier.xp_to_unlock ?? 0).toLocaleString()} XP</Text>
                        <Text style={[styles.previewXpLabel, { color: colors.textMuted }]}> needed</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 36 },
  xpSummary: { paddingBottom: 20, borderBottomWidth: 1, marginHorizontal: 20, marginBottom: 8 },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  xpTextCol: { alignItems: 'center' },
  xpTotal: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  xpSummaryLabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  xpTierBadge: { width: 64, height: 64 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  connectorContainer: { alignItems: 'center', height: 24 },
  connectorLine: { width: 2, flex: 1, borderRadius: 1 },
  connectorLineUnlocked: {},
  tierCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  tierCardUnlocked: {},
  tierCardCurrent: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badgeWrap: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badgeWrapCurrent: {},
  badgeImage: { width: 80, height: 80 },
  badgeImageLocked: { opacity: 0.3 },
  lockOverlay: { position: 'absolute', bottom: 0, right: 0, borderRadius: 10, padding: 2 },
  tierInfo: { flex: 1, gap: 2 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { fontSize: 15, fontWeight: '600' },
  tierThreshold: { fontSize: 11, fontWeight: '500' },
  tierFeature: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  currentBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  expandedPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  previewDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  previewXpRow: { flexDirection: 'row', alignItems: 'baseline' },
  previewXpValue: { fontSize: 16, fontWeight: '700' },
  previewXpLabel: { fontSize: 12, fontWeight: '500' },
  trialBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  trialBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  trialBannerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
