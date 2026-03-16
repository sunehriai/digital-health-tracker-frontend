import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { StreakEntry } from '../../domain/types';

interface StreakTrajectoryCardProps {
  entries: StreakEntry[];
}

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getFullMonthYear(ym: string): string {
  const parts = ym.split('-');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${MONTH_FULL[monthIdx] ?? ym} ${year}`;
}

// ─── Animated row ────────────────────────────────────────────────────────────

function MonthRow({
  entry,
  delta,
  index,
}: {
  entry: StreakEntry;
  delta: number | null;
  index: number;
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 120;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.back(1.05)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: colors.bgElevated, borderColor: colors.border },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Left: flame icon */}
      <View style={styles.flameWrap}>
        <LinearGradient
          colors={['#F59E0B', '#EF4444']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.flameCircle}
        >
          <Flame size={16} color="#FFFFFF" fill="#FFFFFF" />
        </LinearGradient>
      </View>

      {/* Middle: month + delta badge */}
      <View style={styles.midCol}>
        <View style={styles.monthDeltaRow}>
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>
            {getFullMonthYear(entry.month)}
          </Text>
          {delta !== null && delta !== 0 && (
            <View
              style={[
                styles.deltaBadge,
                {
                  backgroundColor: delta > 0
                    ? 'rgba(0, 209, 255, 0.18)'
                    : 'rgba(239, 68, 68, 0.18)',
                },
              ]}
            >
              <Text
                style={[
                  styles.deltaText,
                  { color: delta > 0 ? colors.cyan : '#EF4444' },
                ]}
              >
                {delta > 0 ? `+${delta} days` : `${delta} days`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: streak number */}
      <View style={styles.rightCol}>
        <Text style={[styles.streakNum, { color: colors.cyan }]}>
          {entry.best_streak}
        </Text>
        <Text style={[styles.daysLabel, { color: colors.textMuted }]}>
          days
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Summary message ─────────────────────────────────────────────────────────

function getSummaryMessage(entries: StreakEntry[]): string | null {
  if (entries.length < 2) return null;
  const first = entries[0].best_streak;
  const last = entries[entries.length - 1].best_streak;
  const diff = last - first;
  const months = entries.length;

  if (diff > 0) {
    return `Your streak has grown by +${diff} days over ${months} months.\nYou're building incredible consistency!`;
  }
  if (diff === 0) {
    return `You've maintained a steady streak over ${months} months.\nKeep up the great work!`;
  }
  return `Stay consistent — your best days are ahead!`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function StreakTrajectoryCard({ entries }: StreakTrajectoryCardProps) {
  const { colors } = useTheme();

  if (entries.length === 0) return null;

  const maxStreak = Math.max(...entries.map((e) => e.best_streak), 1);
  const allTimeBest = entries.reduce((a, b) => (a.best_streak > b.best_streak ? a : b));
  const latest = entries[entries.length - 1];
  const summary = getSummaryMessage(entries);

  return (
    <View style={styles.container}>
      {/* Hero chips */}
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.heroLabel}>All-Time Best</Text>
          <Text style={[styles.heroValue, { color: '#F59E0B' }]}>
            {allTimeBest.best_streak} days
          </Text>
        </View>
        {latest && (
          <View style={[styles.heroCard, { backgroundColor: 'rgba(0, 209, 255, 0.1)', borderColor: 'rgba(0, 209, 255, 0.25)' }]}>
            <Flame size={18} color={colors.cyan} />
            <Text style={styles.heroLabel}>This Month</Text>
            <Text style={[styles.heroValue, { color: colors.cyan }]}>
              {latest.best_streak} days
            </Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.cyan }]}>
        Monthly Streak Details
      </Text>

      {/* Month rows */}
      {entries.map((entry, idx) => {
        const delta = idx > 0
          ? entry.best_streak - entries[idx - 1].best_streak
          : null;
        return (
          <MonthRow
            key={entry.month}
            entry={entry}
            delta={delta}
            index={idx}
          />
        );
      })}

      {/* Summary footer */}
      {summary && (
        <View style={[styles.summaryWrap, { backgroundColor: 'rgba(0, 209, 255, 0.06)', borderColor: 'rgba(0, 209, 255, 0.15)' }]}>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {summary}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  // Row card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  // Flame icon
  flameWrap: {
    width: 36,
    height: 36,
  },
  flameCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Middle column
  midCol: {
    flex: 1,
  },
  monthDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Right column
  rightCol: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  streakNum: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  daysLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  // Summary
  summaryWrap: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
});
