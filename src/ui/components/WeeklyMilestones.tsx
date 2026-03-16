/**
 * WeeklyMilestones — Horizontal scrollable row of weekly badge cards.
 * Visible on MyAdherenceScreen for Tier 4+ users only.
 * Uses emoji icons to match Figma design.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { computeWeeklyMilestones } from '../../domain/utils/weeklyMilestoneCalculator';
import type { DayAdherenceRecord } from '../../domain/types';

interface WeeklyMilestonesProps {
  days: DayAdherenceRecord[];
  yearMonth: string;
}

/** Emoji map matching Figma: fire, flexing arm, climbing person */
const EMOJI_MAP: Record<string, string> = {
  Flame: '\uD83D\uDD25',           // 🔥
  Dumbbell: '\uD83D\uDCAA',        // 💪
  PersonStanding: '\uD83E\uDDD7',  // 🧗
};

export default function WeeklyMilestones({ days, yearMonth }: WeeklyMilestonesProps) {
  const { colors } = useTheme();
  const milestones = useMemo(
    () => computeWeeklyMilestones(days, yearMonth),
    [days, yearMonth],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        WEEKLY MILESTONES
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {milestones.map((m) => {
          const emoji = EMOJI_MAP[m.iconName] ?? '\u2B50'; // ⭐ fallback

          if (m.unlocked) {
            return (
              <View
                key={m.weekNumber}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bgElevated,
                    borderColor: colors.cyan,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.cyanDim },
                  ]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </View>
                <Text
                  style={[styles.weekLabel, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {m.label}
                </Text>
                <Text
                  style={[styles.milestoneName, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {m.milestoneName}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={m.weekNumber}
              style={[
                styles.card,
                styles.cardLocked,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: 'rgba(255,255,255,0.2)',
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: 'rgba(255,255,255,0.1)' },
                ]}
              >
                <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text
                style={[styles.weekLabel, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {m.label}
              </Text>
              <Text
                style={[styles.milestoneName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                Locked
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  scrollView: {
    marginHorizontal: -4,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  card: {
    width: 100,
    height: 124,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardLocked: {
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  milestoneName: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
