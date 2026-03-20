/**
 * MilestoneBanner — Shows progress toward the next consecutive
 * perfect-month milestone (Dedicated / Committed / Devoted).
 * Matches the Insight Trends QuickStatsCard milestone bar style:
 * trophy icon + label + shimmer progress bar + XP reward badge.
 *
 * When delayed doses exist (minor glitch), an amber callout appears
 * using the same warning color as the 7-day bar graph's "delayed" state.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Trophy, Clock, Zap, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ConsistencyBonusInfo } from '../../domain/types';

const MILESTONES = [
  { name: 'Dedicated', months: 3, xp: 100, color: '#CD7F32' },   // Bronze
  { name: 'Committed', months: 6, xp: 250, color: '#C0C0C0' },   // Silver
  { name: 'Devoted', months: 12, xp: 500, color: '#FFD700' },     // Gold
] as const;

const MILESTONE_GOLD = '#FBBF24';
const CONSISTENCY_BONUS_COLOR = '#06B6D4'; // Cyan/teal — distinct from milestone palette

interface MilestoneBannerProps {
  perfectMonthsStreak: number;
  /** Number of delayed/imperfect days this month (taken but late) */
  imperfectDays: number;
  /** Whether the viewed month has any missed days */
  currentMonthHasMissedDays: boolean;
  /** Whether we're viewing the current (in-progress) month */
  isCurrentMonth: boolean;
  /** Consistency bonus info (post-Devoted). Optional — banner falls back to dead-end if undefined. */
  consistencyBonus?: ConsistencyBonusInfo | null;
}

function getNextMilestone(streak: number) {
  for (const m of MILESTONES) {
    if (streak < m.months) return m;
  }
  return null; // all achieved
}

export default function MilestoneBanner({
  perfectMonthsStreak,
  imperfectDays,
  currentMonthHasMissedDays,
  isCurrentMonth,
  consistencyBonus,
}: MilestoneBannerProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const next = useMemo(() => getNextMilestone(perfectMonthsStreak), [perfectMonthsStreak]);
  const allAchieved = next === null;
  const showConsistencyBonus = allAchieved && consistencyBonus != null;
  const hasMinorGlitch = isCurrentMonth && !currentMonthHasMissedDays && imperfectDays > 0;

  // Consistency bonus progress: (3 - months_until_next) / 3
  const cbProgress = showConsistencyBonus
    ? (3 - consistencyBonus!.months_until_next) / 3
    : 0;
  const cbRemaining = showConsistencyBonus ? consistencyBonus!.months_until_next : 0;

  const progress = showConsistencyBonus ? cbProgress : (next ? perfectMonthsStreak / next.months : 1);
  const remaining = showConsistencyBonus ? cbRemaining : (next ? next.months - perfectMonthsStreak : 0);

  // Shimmer animation (continuous, matches QuickStatsCard)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 300],
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Minor glitch callout — amber, matches 7-day bar graph delayed color */}
      {hasMinorGlitch && (
        <View style={[styles.glitchCallout, { backgroundColor: `${colors.warning}14` }]}>
          <Clock size={12} color={colors.warning} />
          <Text style={[styles.glitchText, { color: colors.warning }]}>
            {imperfectDays} delayed dose{imperfectDays !== 1 ? 's' : ''} this month — stay on time!
          </Text>
        </View>
      )}

      {/* Milestone row: icon + label + XP badge */}
      <View style={styles.milestoneHeader}>
        <View style={styles.headerLeft}>
          {showConsistencyBonus ? (
            <RefreshCw size={14} color={CONSISTENCY_BONUS_COLOR} strokeWidth={2} />
          ) : (
            <Trophy size={14} color={next?.color ?? MILESTONE_GOLD} strokeWidth={2} />
          )}
          {showConsistencyBonus ? (
            <Text style={[styles.milestoneLabel, { color: colors.textSecondary }]}>
              {cbRemaining} perfect month{cbRemaining !== 1 ? 's' : ''} to{' '}
              <Text style={{ color: CONSISTENCY_BONUS_COLOR, fontWeight: '700' }}>Consistency Bonus</Text>
            </Text>
          ) : allAchieved ? (
            <Text style={[styles.milestoneLabel, { color: MILESTONE_GOLD }]}>
              All milestones achieved!
            </Text>
          ) : (
            <Text style={[styles.milestoneLabel, { color: colors.textSecondary }]}>
              {remaining} perfect month{remaining !== 1 ? 's' : ''} to{' '}
              <Text style={{ color: next!.color, fontWeight: '700' }}>{next!.name}</Text>
            </Text>
          )}
        </View>
        {showConsistencyBonus ? (
          <View style={[styles.xpBadge, { backgroundColor: `${CONSISTENCY_BONUS_COLOR}18` }]}>
            <Zap size={10} color={CONSISTENCY_BONUS_COLOR} />
            <Text style={[styles.xpBadgeText, { color: CONSISTENCY_BONUS_COLOR }]}>
              +{consistencyBonus!.xp_reward} XP
            </Text>
          </View>
        ) : !allAchieved ? (
          <View style={[styles.xpBadge, { backgroundColor: `${next!.color}18` }]}>
            <Zap size={10} color={next!.color} />
            <Text style={[styles.xpBadgeText, { color: next!.color }]}>
              +{next!.xp} XP
            </Text>
          </View>
        ) : null}
      </View>

      {/* Progress bar with shimmer (matches QuickStatsCard style) */}
      <View style={[styles.progressTrack, { backgroundColor: colors.bgElevated }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: showConsistencyBonus ? CONSISTENCY_BONUS_COLOR : (next?.color ?? MILESTONE_GOLD),
            },
          ]}
        />
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />
      </View>

      {/* Month markers below progress bar */}
      {(showConsistencyBonus || !allAchieved) && (
        <View style={styles.markerRow}>
          <Text style={[styles.markerText, { color: colors.textMuted }]}>
            {showConsistencyBonus
              ? `${3 - cbRemaining}/3 months`
              : `${perfectMonthsStreak}/${next!.months} months`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  // Glitch callout
  glitchCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  glitchText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  // Milestone header
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Progress bar
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
  // Marker
  markerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  markerText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
