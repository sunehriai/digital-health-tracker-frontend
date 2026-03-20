/**
 * MyJourneyScreen -- Vertical tier progression path + Milestones section.
 *
 * Displays all 5 tiers from top (Tier 5) to bottom (Tier 1).
 * Unlocked = full color badge, Locked = greyed + lock overlay,
 * Current = highlighted with cyan glow. Tap locked tier to expand preview.
 *
 * Step 33: Milestones section below tier progression.
 * Shows Dedicated (3mo), Committed (6mo), Devoted (12mo) with
 * progress bars and achievement states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Star, Award, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGamification } from '../hooks/useGamification';
import { gamificationService } from '../../data/services/gamificationService';
import { TIER_ASSETS, TIER_NAMES, TIER_THRESHOLDS, getTierAsset } from '../../domain/constants/tierAssets';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import type { TierInfo, MilestoneInfo, ConsistencyBonusInfo } from '../../domain/types';

const TIER_FEATURES: Record<number, string> = {
  1: 'Dashboard, medication logging, Emergency Vault',
  2: 'Monthly Adherence Calendar + Waiver Badge',
  3: 'Insight Trends + Waiver Badge',
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

/** Milestone display colors by name */
const MILESTONE_COLORS: Record<string, string> = {
  Dedicated: '#CD7F32', // Bronze
  Committed: '#C0C0C0', // Silver
  Devoted: '#FFD700',   // Gold
};

export default function MyJourneyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { totalXp, currentTier, perfectMonthsStreak, loading: statusLoading } = useGamification();
  const { colors, isDark } = useTheme();
  const [journeyTiers, setJourneyTiers] = useState<TierInfo[] | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [selectedLockedTier, setSelectedLockedTier] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<MilestoneInfo[] | null>(null);
  const [consistencyBonus, setConsistencyBonus] = useState<ConsistencyBonusInfo | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

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

  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    try {
      const data = await gamificationService.getMilestones();
      setMilestones(data.milestones);
      setConsistencyBonus(data.consistency_bonus ?? null);
    } catch {
      // Fallback milestones using local data
      // R17: Pre-existing bug — is_achieved hardcoded false. OUT OF SCOPE.
      const fallback: MilestoneInfo[] = [
        { name: 'Dedicated', required_months: 3, xp_reward: 100, current_streak: perfectMonthsStreak, is_achieved: false },
        { name: 'Committed', required_months: 6, xp_reward: 250, current_streak: perfectMonthsStreak, is_achieved: false },
        { name: 'Devoted', required_months: 12, xp_reward: 500, current_streak: perfectMonthsStreak, is_achieved: false },
      ];
      setMilestones(fallback);
      setConsistencyBonus(null);
    } finally {
      setMilestonesLoading(false);
    }
  }, [perfectMonthsStreak]);

  useEffect(() => { fetchJourney(); }, [fetchJourney]);
  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  const loading = statusLoading || journeyLoading;
  const displayTiers = journeyTiers ? [...journeyTiers].reverse() : [];

  const handleTierPress = (tier: TierInfo) => {
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
          {/* Tier Progression Path */}
          {displayTiers.map((tier, index) => {
            const isUnlocked = tier.is_unlocked;
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
                          {isUnlocked ? 'Unlocked: ' : 'Unlocks: '}{tier.feature_unlock}
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

          {/* Step 33: Milestones Section */}
          <View style={[styles.milestonesSection, { borderTopColor: colors.border }]}>
            <View style={styles.milestonesSectionHeader}>
              <Award color={colors.cyan} size={18} strokeWidth={2} />
              <Text style={[styles.milestonesSectionTitle, { color: colors.textPrimary }]}>Monthly Milestones</Text>
            </View>
            <Text style={[styles.milestonesSectionDesc, { color: colors.textMuted }]}>
              Maintain consecutive perfect months to earn milestone rewards.
            </Text>

            {milestonesLoading ? (
              <ActivityIndicator size="small" color={colors.cyan} style={{ marginTop: 16 }} />
            ) : (
              milestones?.map((milestone) => {
                const milestoneColor = MILESTONE_COLORS[milestone.name] ?? colors.cyan;
                const progress = Math.min(1, milestone.current_streak / milestone.required_months);
                const progressPercent = progress * 100;

                return (
                  <View
                    key={milestone.name}
                    style={[
                      styles.milestoneCard,
                      { backgroundColor: isDark ? colors.bgCard : colors.bgElevated, borderColor: colors.border },
                      milestone.is_achieved && styles.milestoneCardAchieved,
                    ]}
                  >
                    <View style={styles.milestoneHeader}>
                      <View style={styles.milestoneNameRow}>
                        {milestone.is_achieved ? (
                          <View style={[styles.milestoneCheckCircle, { backgroundColor: milestoneColor }]}>
                            <Check color="#000" size={12} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={[styles.milestoneIconCircle, { borderColor: milestoneColor }]}>
                            <Award color={milestoneColor} size={14} strokeWidth={2} />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.milestoneName,
                            { color: colors.textPrimary },
                            milestone.is_achieved && { color: milestoneColor },
                          ]}
                        >
                          {milestone.name}
                        </Text>
                      </View>
                      <Text style={[styles.milestoneReward, { color: colors.cyan }]}>+{milestone.xp_reward} XP</Text>
                    </View>

                    <Text style={[styles.milestoneRequirement, { color: colors.textMuted }]}>
                      {milestone.is_achieved
                        ? 'Achieved!'
                        : `${milestone.current_streak} / ${milestone.required_months} perfect months`}
                    </Text>

                    {!milestone.is_achieved && (
                      <View style={[styles.milestoneProgressTrack, { backgroundColor: colors.bgSubtle }]}>
                        <View
                          style={[
                            styles.milestoneProgressFill,
                            { width: `${progressPercent}%`, backgroundColor: milestoneColor },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Consistency Bonus card (post-Devoted recurring reward) */}
            {consistencyBonus && (
              <View
                style={[
                  styles.milestoneCard,
                  { backgroundColor: isDark ? colors.bgCard : colors.bgElevated, borderColor: '#06B6D4' },
                ]}
              >
                <View style={styles.milestoneHeader}>
                  <View style={styles.milestoneNameRow}>
                    <View style={[styles.milestoneIconCircle, { borderColor: '#06B6D4' }]}>
                      <Award color="#06B6D4" size={14} strokeWidth={2} />
                    </View>
                    <Text style={[styles.milestoneName, { color: '#06B6D4' }]}>
                      Consistency Bonus
                    </Text>
                  </View>
                  <Text style={[styles.milestoneReward, { color: '#06B6D4' }]}>+{consistencyBonus.xp_reward} XP</Text>
                </View>

                <Text style={[styles.milestoneRequirement, { color: colors.textMuted }]}>
                  {consistencyBonus.months_until_next === 3
                    ? 'New cycle started — keep going!'
                    : `${3 - consistencyBonus.months_until_next} / 3 perfect months`}
                  {consistencyBonus.total_awarded > 0
                    ? ` (earned ${consistencyBonus.total_awarded}x = +${consistencyBonus.total_xp_earned} XP)`
                    : ''}
                </Text>

                <View style={[styles.milestoneProgressTrack, { backgroundColor: colors.bgSubtle }]}>
                  <View
                    style={[
                      styles.milestoneProgressFill,
                      {
                        width: `${((3 - consistencyBonus.months_until_next) / 3) * 100}%`,
                        backgroundColor: '#06B6D4',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

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

  // Step 33: Milestones styles
  milestonesSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  milestonesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestonesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  milestonesSectionDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  milestoneCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  milestoneCardAchieved: {
    borderColor: 'rgba(255, 215, 0, 0.25)',
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneReward: {
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneRequirement: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 30,
  },
  milestoneProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 30,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
