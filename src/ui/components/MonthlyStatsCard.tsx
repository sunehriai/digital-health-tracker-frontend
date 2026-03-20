/**
 * MonthlyStatsCard — Three-stat summary (Perfect Days, Day Streak, Adherence %)
 * plus a motivational message and next milestone progress.
 * Visible on MyAdherenceScreen for Tier 4+ users.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Flame, Award, Target } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { computeMonthlyStats } from '../../domain/utils/monthlyStatsUtils';
import type { MonthSummary } from '../../domain/types';

interface MonthlyStatsCardProps {
  monthSummary: MonthSummary;
  perfectMonthsStreak?: number;
}

const MILESTONES = [
  { name: 'Dedicated', requiredMonths: 3, xpReward: 100 },
  { name: 'Committed', requiredMonths: 6, xpReward: 250 },
  { name: 'Devoted', requiredMonths: 12, xpReward: 500 },
];

function getNextMilestone(streak: number) {
  for (const m of MILESTONES) {
    if (streak < m.requiredMonths) {
      return { ...m, remaining: m.requiredMonths - streak };
    }
  }
  return null; // All milestones achieved
}

const STREAK_ORANGE = '#FF6B35';
const STREAK_ORANGE_DIM = 'rgba(255, 107, 53, 0.12)';

export default function MonthlyStatsCard({ monthSummary, perfectMonthsStreak = 0 }: MonthlyStatsCardProps) {
  const { colors } = useTheme();
  const stats = useMemo(() => computeMonthlyStats(monthSummary), [monthSummary]);
  const nextMilestone = useMemo(() => getNextMilestone(perfectMonthsStreak), [perfectMonthsStreak]);

  const noData = stats.totalScheduledDays === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard }]}>
      {/* Three stat columns */}
      <View style={styles.statsRow}>
        {/* Perfect Days */}
        <View style={styles.statCol}>
          <View style={[styles.iconCircle, { backgroundColor: colors.cyanDim }]}>
            <CheckCircle size={20} color={colors.cyan} strokeWidth={2} />
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {noData ? '\u2014' : `${stats.perfectDays}/${stats.totalScheduledDays}`}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Perfect Days
          </Text>
        </View>

        {/* Day Streak */}
        <View style={styles.statCol}>
          <View style={[styles.iconCircle, { backgroundColor: STREAK_ORANGE_DIM }]}>
            <Flame size={20} color={STREAK_ORANGE} strokeWidth={2} />
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {noData ? '\u2014' : String(stats.bestStreakDays)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Day Streak
          </Text>
        </View>

        {/* Adherence % */}
        <View style={styles.statCol}>
          <View style={[styles.iconCircle, { backgroundColor: colors.cyanDim }]}>
            <Award size={20} color={colors.cyan} strokeWidth={2} />
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {noData ? '\u2014' : `${stats.adherencePct}%`}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Adherence
          </Text>
        </View>
      </View>

      {/* Motivational message */}
      <View style={styles.messageRow}>
        <Text style={styles.messageEmoji}>{'\uD83D\uDCAA'}</Text>
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>
          {stats.motivationalMessage}
        </Text>
      </View>

      {/* Next milestone progress */}
      {nextMilestone && (
        <View style={[styles.milestoneRow, { borderTopColor: colors.border }]}>
          <View style={styles.milestoneLeft}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(255, 215, 0, 0.12)' }]}>
              <Target size={16} color="#FFD700" />
            </View>
            <View>
              <Text style={[styles.milestoneName, { color: colors.textPrimary }]}>
                {nextMilestone.name}
              </Text>
              <Text style={[styles.milestoneDetail, { color: colors.textMuted }]}>
                {nextMilestone.remaining} perfect month{nextMilestone.remaining !== 1 ? 's' : ''} to go
              </Text>
            </View>
          </View>
          <View style={styles.milestoneRight}>
            <Text style={[styles.milestoneXp, { color: '#FFD700' }]}>
              +{nextMilestone.xpReward} XP
            </Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.bgElevated }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: '#FFD700',
                    width: `${Math.min(100, (perfectMonthsStreak / nextMilestone.requiredMonths) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* All milestones achieved */}
      {!nextMilestone && perfectMonthsStreak >= 12 && (
        <View style={[styles.milestoneRow, { borderTopColor: colors.border }]}>
          <View style={styles.milestoneLeft}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(255, 215, 0, 0.12)' }]}>
              <Award size={16} color="#FFD700" />
            </View>
            <Text style={[styles.milestoneName, { color: '#FFD700' }]}>
              All milestones achieved!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  messageEmoji: {
    fontSize: 16,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Milestone
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneName: {
    fontSize: 13,
    fontWeight: '700',
  },
  milestoneDetail: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  milestoneRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  milestoneXp: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
