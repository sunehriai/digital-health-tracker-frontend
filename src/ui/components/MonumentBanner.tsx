import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { MonthSummary } from '../../domain/types';

const MONUMENT_THRESHOLD_DAYS = 22;

interface MonumentBannerProps {
  summary: MonthSummary | null;
}

export default function MonumentBanner({ summary }: MonumentBannerProps) {
  const { colors, isDark } = useTheme();

  if (!summary) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Text style={[styles.placeholder, { color: colors.textMuted }]}>—</Text>
      </View>
    );
  }

  const { perfect_days, total_scheduled_days } = summary;

  // No medications were scheduled this month
  if (total_scheduled_days === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Text style={[styles.progressLabel, { color: colors.textMuted, textAlign: 'center' }]}>
          No doses scheduled
        </Text>
      </View>
    );
  }

  const goalMet = perfect_days >= MONUMENT_THRESHOLD_DAYS;
  const progressPct = Math.min(1, perfect_days / MONUMENT_THRESHOLD_DAYS);

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
      {goalMet ? (
        <View style={styles.goalRow}>
          <Trophy size={20} color="#F59E0B" fill="#F59E0B" />
          <Text style={[styles.goalText, { color: colors.textPrimary }]}>
            Monthly Monument Built — {perfect_days} perfect days
          </Text>
        </View>
      ) : (
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {perfect_days}/{MONUMENT_THRESHOLD_DAYS} days toward your Monument
          </Text>
          <View style={[styles.progressTrack, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct * 100}%`, backgroundColor: colors.cyan },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  placeholder: {
    textAlign: 'center',
    fontSize: 14,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  progressSection: {
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
