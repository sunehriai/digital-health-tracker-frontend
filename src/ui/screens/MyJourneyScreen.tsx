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
import { TIER_ASSETS, TIER_NAMES, TIER_THRESHOLDS } from '../../domain/constants/tierAssets';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { TierInfo, MilestoneInfo } from '../../domain/types';

const TIER_FEATURES: Record<number, string> = {
  1: 'Dashboard access',
  2: 'Emergency Vault',
  3: 'Waiver Badge',
  4: 'Insight Trends',
  5: 'Sage Reports',
};

const TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'Your starting point. Track medications and build your daily ritual.',
  2: 'Unlock your Emergency Vault to store critical medical information for emergencies.',
  3: 'Access Insight Trends to visualize your adherence patterns over time.',
  4: 'Generate personalized Sage Reports with deep health analytics.',
  5: 'You have mastered the art of health stewardship. All features are yours.',
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
  const [journeyTiers, setJourneyTiers] = useState<TierInfo[] | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [selectedLockedTier, setSelectedLockedTier] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<MilestoneInfo[] | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  const fetchJourney = useCallback(async () => {
    setJourneyLoading(true);
    try {
      const data = await gamificationService.getJourney();
      setJourneyTiers(data.tiers);
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
    } catch {
      // Fallback milestones using local data
      const fallback: MilestoneInfo[] = [
        { name: 'Dedicated', required_months: 3, xp_reward: 100, current_streak: perfectMonthsStreak, is_achieved: false },
        { name: 'Committed', required_months: 6, xp_reward: 250, current_streak: perfectMonthsStreak, is_achieved: false },
        { name: 'Devoted', required_months: 12, xp_reward: 500, current_streak: perfectMonthsStreak, is_achieved: false },
      ];
      setMilestones(fallback);
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
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft color={colors.textSecondary} size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Journey</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.xpSummary}>
        <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP</Text>
        <Text style={styles.xpSummaryLabel}>
          {TIER_NAMES[currentTier] ?? 'Observer'} — Tier {currentTier}
        </Text>
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
                    <View style={[styles.connectorLine, isUnlocked && styles.connectorLineUnlocked]} />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.tierCard, isUnlocked && styles.tierCardUnlocked, isCurrent && styles.tierCardCurrent]}
                  activeOpacity={isUnlocked ? 1 : 0.7}
                  onPress={() => handleTierPress(tier)}
                >
                  <View style={styles.tierRow}>
                    <View style={[styles.badgeWrap, isCurrent && styles.badgeWrapCurrent]}>
                      <Image
                        source={TIER_ASSETS[tier.tier]}
                        style={[styles.badgeImage, !isUnlocked && styles.badgeImageLocked]}
                        resizeMode="contain"
                      />
                      {!isUnlocked && (
                        <View style={styles.lockOverlay}>
                          <Lock color="#FFD700" size={14} strokeWidth={2.5} />
                        </View>
                      )}
                    </View>

                    <View style={styles.tierInfo}>
                      <View style={styles.tierNameRow}>
                        <Text style={[styles.tierName, isUnlocked && styles.tierNameUnlocked, isCurrent && styles.tierNameCurrent]}>
                          {tier.name}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Star color={colors.cyan} size={9} strokeWidth={2.5} fill={colors.cyan} />
                            <Text style={styles.currentBadgeText}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.tierThreshold}>{tier.xp_threshold.toLocaleString()} XP</Text>
                      {tier.feature_unlock && (
                        <Text style={styles.tierFeature}>
                          {isUnlocked ? 'Unlocked: ' : 'Unlocks: '}{tier.feature_unlock}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isExpanded && !isUnlocked && (
                    <View style={styles.expandedPreview}>
                      <Text style={styles.previewDesc}>{TIER_DESCRIPTIONS[tier.tier] ?? ''}</Text>
                      <View style={styles.previewXpRow}>
                        <Text style={styles.previewXpValue}>{(tier.xp_to_unlock ?? 0).toLocaleString()} XP</Text>
                        <Text style={styles.previewXpLabel}> needed</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Step 33: Milestones Section */}
          <View style={styles.milestonesSection}>
            <View style={styles.milestonesSectionHeader}>
              <Award color={colors.cyan} size={18} strokeWidth={2} />
              <Text style={styles.milestonesSectionTitle}>Monthly Milestones</Text>
            </View>
            <Text style={styles.milestonesSectionDesc}>
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
                            milestone.is_achieved && { color: milestoneColor },
                          ]}
                        >
                          {milestone.name}
                        </Text>
                      </View>
                      <Text style={styles.milestoneReward}>+{milestone.xp_reward} XP</Text>
                    </View>

                    <Text style={styles.milestoneRequirement}>
                      {milestone.is_achieved
                        ? 'Achieved!'
                        : `${milestone.current_streak} / ${milestone.required_months} perfect months`}
                    </Text>

                    {!milestone.is_achieved && (
                      <View style={styles.milestoneProgressTrack}>
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
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 36 },
  xpSummary: { alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border, marginHorizontal: 20, marginBottom: 8 },
  xpTotal: { color: colors.cyan, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  xpSummaryLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500', marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  connectorContainer: { alignItems: 'center', height: 24 },
  connectorLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  connectorLineUnlocked: { backgroundColor: 'rgba(0, 209, 255, 0.3)' },
  tierCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  tierCardUnlocked: { borderColor: 'rgba(0, 209, 255, 0.15)' },
  tierCardCurrent: {
    borderColor: colors.cyan, borderWidth: 2,
    shadowColor: colors.cyan, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badgeWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badgeWrapCurrent: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)', borderWidth: 2,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    shadowColor: colors.cyan, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  badgeImage: { width: 40, height: 40 },
  badgeImageLocked: { opacity: 0.3 },
  lockOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.bg, borderRadius: 10, padding: 2 },
  tierInfo: { flex: 1, gap: 2 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  tierNameUnlocked: { color: colors.textPrimary },
  tierNameCurrent: { color: colors.cyan },
  tierThreshold: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  tierFeature: { color: colors.textSecondary, fontSize: 11, fontWeight: '500', marginTop: 2 },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0, 209, 255, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  currentBadgeText: { color: colors.cyan, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  expandedPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  previewDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  previewXpRow: { flexDirection: 'row', alignItems: 'baseline' },
  previewXpValue: { color: colors.cyan, fontSize: 16, fontWeight: '700' },
  previewXpLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },

  // Step 33: Milestones styles
  milestonesSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  milestonesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestonesSectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  milestonesSectionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  milestoneCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneReward: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneRequirement: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 30,
  },
  milestoneProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 30,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
