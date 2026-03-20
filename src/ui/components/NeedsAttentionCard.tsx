import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { NeedsAttentionEntry } from '../../domain/types';

interface NeedsAttentionCardProps {
  entries: NeedsAttentionEntry[] | null;
  overflow: number;
}

function TrendIcon({ trend, colors }: { trend: string; colors: any }) {
  const size = 16;
  if (trend === 'improving') return <TrendingUp size={size} color={colors.success} />;
  if (trend === 'declining') return <TrendingDown size={size} color={colors.error} />;
  return <Minus size={size} color={colors.textMuted} />;
}

function TrendLabel({ trend, colors }: { trend: string; colors: any }) {
  const label = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable';
  const color = trend === 'improving' ? colors.success : trend === 'declining' ? colors.error : colors.textMuted;
  return <Text style={[styles.trendLabel, { color }]}>{label}</Text>;
}

export default function NeedsAttentionCard({ entries, overflow }: NeedsAttentionCardProps) {
  const { colors } = useTheme();
  const allClear = !entries || entries.length === 0;

  return (
    <View style={styles.container}>
      {allClear ? (
        <View style={styles.allClear}>
          <View style={styles.allClearIconBg}>
            <CheckCircle size={32} color="#22C55E" />
          </View>
          <Text style={[styles.allClearTitle, { color: '#22C55E' }]}>All On Track</Text>
          <Text style={[styles.allClearSubtitle, { color: colors.textMuted }]}>
            Every medication is above 95% adherence
          </Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {/* Summary badge */}
          <View style={styles.summaryBadge}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={styles.summaryText}>
              {entries!.length + (overflow ?? 0)} medication{entries!.length + (overflow ?? 0) !== 1 ? 's' : ''} below 95%
            </Text>
          </View>

          {entries!.map((med) => {
            const barColor = med.adherence_pct < 50 ? '#EF4444' : '#F59E0B';
            const barBgColor = med.adherence_pct < 50 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
            const barWidth = Math.max(4, med.adherence_pct);

            return (
              <View key={med.medication_id} style={[styles.medCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                <View style={styles.medHeader}>
                  <Text
                    style={[styles.medName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {med.medication_name}
                  </Text>
                  <View style={styles.medRight}>
                    <TrendIcon trend={med.trend} colors={colors} />
                    <TrendLabel trend={med.trend} colors={colors} />
                  </View>
                </View>
                <View style={[styles.barBg, { backgroundColor: barBgColor }]}>
                  <View
                    style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]}
                  />
                </View>
                <Text style={[styles.pctText, { color: barColor }]}>
                  {Math.round(med.adherence_pct)}% adherence
                </Text>
              </View>
            );
          })}

          {overflow > 0 && (
            <Text style={[styles.overflowText, { color: colors.textMuted }]}>
              +{overflow} more medication{overflow !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  // All clear state
  allClear: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  allClearIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  allClearTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  allClearSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Summary
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Med cards
  rows: {
    gap: 12,
  },
  medCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  medRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  barBg: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overflowText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
