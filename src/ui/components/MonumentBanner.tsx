import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trophy, TrendingUp } from 'lucide-react-native';
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

  const { perfect_days, xp_start, xp_end } = summary;
  const goalMet = perfect_days >= MONUMENT_THRESHOLD_DAYS;
  const progressPct = Math.min(1, perfect_days / MONUMENT_THRESHOLD_DAYS);

  const hasXpData = xp_start != null && xp_end != null;
  const xpDelta = hasXpData ? xp_end! - xp_start! : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
      {/* Monument progress */}
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

      {/* XP journey */}
      <View style={styles.xpRow}>
        <TrendingUp size={14} color={colors.textMuted} />
        {hasXpData ? (
          <Text style={[styles.xpText, { color: colors.textSecondary }]}>
            {xp_start!.toLocaleString()} XP → {xp_end!.toLocaleString()} XP{' '}
            <Text style={{ color: xpDelta > 0 ? colors.cyan : colors.textMuted }}>
              (+{xpDelta.toLocaleString()} this month)
            </Text>
          </Text>
        ) : (
          <Text style={[styles.xpText, { color: colors.textMuted }]}>
            XP data not available for this month
          </Text>
        )}
      </View>
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
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
