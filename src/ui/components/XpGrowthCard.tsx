import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { TIER_NAMES, TIER_THRESHOLDS } from '../../domain/constants/tierAssets';

interface XpGrowthCardProps {
  xpStart: number | null;
  xpEnd: number | null;
  prevMonthXpDelta: number | null;
  currentTier: number;
  totalXp: number;
}

export default function XpGrowthCard({
  xpStart,
  xpEnd,
  prevMonthXpDelta,
  currentTier,
  totalXp,
}: XpGrowthCardProps) {
  const { colors } = useTheme();

  const hasXpData = xpStart != null && xpEnd != null;
  const thisMonthDelta = hasXpData ? xpEnd - xpStart : 0;

  // Trend percentage (month-over-month)
  let trendLabel = 'NEW';
  if (hasXpData && prevMonthXpDelta != null && prevMonthXpDelta > 0) {
    const trendPct = Math.round(((thisMonthDelta - prevMonthXpDelta) / prevMonthXpDelta) * 100);
    trendLabel = `${trendPct >= 0 ? '+' : ''}${trendPct}%`;
  }

  // Tier progress
  const tierName = TIER_NAMES[currentTier] ?? 'Observer';
  const nextTier = currentTier < 5 ? currentTier + 1 : null;
  const nextTierName = nextTier ? TIER_NAMES[nextTier] : null;
  const currentThreshold = TIER_THRESHOLDS[currentTier] ?? 0;
  const nextThreshold = nextTier ? (TIER_THRESHOLDS[nextTier] ?? 10000) : currentThreshold;
  const tierRange = nextThreshold - currentThreshold;
  const tierProgress = tierRange > 0 ? Math.min(1, (totalXp - currentThreshold) / tierRange) : 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Top row: title + trend badge */}
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>XP GROWTH</Text>
        <View style={[styles.trendBadge, { backgroundColor: colors.cyanDim }]}>
          <TrendingUp size={12} color={colors.cyan} />
          <Text style={[styles.trendText, { color: colors.cyan }]}>{trendLabel}</Text>
        </View>
      </View>

      {/* XP delta */}
      {hasXpData ? (
        <View style={styles.deltaRow}>
          <Text style={[styles.deltaNumber, { color: colors.cyan }]}>
            +{thisMonthDelta}
          </Text>
          <Text style={[styles.deltaLabel, { color: colors.textMuted }]}>
            {' '}XP this month
          </Text>
        </View>
      ) : (
        <Text style={[styles.noData, { color: colors.textMuted }]}>
          XP data not available for this month
        </Text>
      )}

      {/* Tier progress bar */}
      <View style={styles.tierSection}>
        <View style={styles.tierLabels}>
          <Text style={[styles.tierName, { color: colors.textPrimary }]}>{tierName}</Text>
          {hasXpData && (
            <Text style={[styles.tierXpRange, { color: colors.textMuted }]}>
              {xpStart} → {xpEnd}
            </Text>
          )}
          {nextTierName && (
            <Text style={[styles.tierNext, { color: colors.cyan }]}>
              {nextTierName} Soon
            </Text>
          )}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.bgElevated }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(tierProgress * 100)}%`, backgroundColor: colors.cyan },
            ]}
          />
        </View>
      </View>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  deltaNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  deltaLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  noData: {
    fontSize: 13,
    marginBottom: 12,
  },
  tierSection: {
    gap: 6,
  },
  tierLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierXpRange: {
    fontSize: 11,
    fontWeight: '500',
  },
  tierNext: {
    fontSize: 12,
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
