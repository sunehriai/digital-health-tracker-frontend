import React, { useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Line, Path, Polyline, Rect } from 'react-native-svg';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { YearlyTrendEntry } from '../../domain/types';

interface YearlyTrendCardProps {
  entries: YearlyTrendEntry[];
  year: number;
  minYear: number;
  maxYear: number;
  onYearChange: (year: number) => void;
  loading?: boolean;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthLabel(ym: string, includeYear = false): string {
  const parts = ym.split('-');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthStr = MONTH_SHORT[monthIdx] ?? ym;
  if (includeYear && parts[0]) {
    return `${monthStr} '${parts[0].slice(2)}`;
  }
  return monthStr;
}

function getFullMonthYear(ym: string): string {
  const parts = ym.split('-');
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${MONTH_SHORT[monthIdx] ?? ym} ${parts[0]}`;
}

const CHART_H = 220;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const GRID_LINES = [25, 50, 75, 100];
const GOLD = '#FFD700';

export default function YearlyTrendCard({ entries, year, minYear, maxYear, onYearChange, loading }: YearlyTrendCardProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const canGoBack = year > minYear;
  const canGoForward = year < maxYear;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const toX = (i: number) =>
    entries.length === 1
      ? PAD_LEFT + plotW / 2
      : PAD_LEFT + (plotW / (entries.length - 1)) * i;
  const toY = (pct: number) => PAD_TOP + plotH - (pct / 100) * plotH;

  const points = entries.map((e, i) => `${toX(i)},${toY(e.adherence_pct)}`).join(' ');

  // Area fill path (line + bottom)
  const areaPath = entries.length > 0
    ? `M${toX(0)},${toY(entries[0].adherence_pct)} ` +
      entries.slice(1).map((e, i) => `L${toX(i + 1)},${toY(e.adherence_pct)}`).join(' ') +
      ` L${toX(entries.length - 1)},${PAD_TOP + plotH} L${toX(0)},${PAD_TOP + plotH} Z`
    : '';

  // Trend calculation
  const latest = entries[entries.length - 1]?.adherence_pct ?? 0;
  const previous = entries.length >= 2 ? entries[entries.length - 2].adherence_pct : latest;
  const trendDelta = Math.round(latest - previous);
  const isUp = trendDelta >= 0;

  const bestMonth = entries.length > 0
    ? entries.reduce((a, b) => (a.adherence_pct > b.adherence_pct ? a : b), entries[0])
    : null;

  const hasData = entries.length > 0;

  return (
    <View style={styles.container}>
      {/* Year navigator */}
      <View style={styles.yearNav}>
        <TouchableOpacity
          onPress={() => canGoBack && onYearChange(year - 1)}
          disabled={!canGoBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.yearArrow, !canGoBack && styles.yearArrowDisabled]}
        >
          <ChevronLeft size={20} color={canGoBack ? colors.cyan : colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.yearLabelWrap}>
          <Text style={[styles.yearLabel, { color: colors.textPrimary }]}>{year}</Text>
          {loading && <ActivityIndicator size="small" color={colors.cyan} style={{ marginLeft: 8 }} />}
        </View>
        <TouchableOpacity
          onPress={() => canGoForward && onYearChange(year + 1)}
          disabled={!canGoForward}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.yearArrow, !canGoForward && styles.yearArrowDisabled]}
        >
          <ChevronRight size={20} color={canGoForward ? colors.cyan : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Hero stats */}
      {hasData && (
        <View style={styles.heroRow}>
          <View style={[styles.heroCard, { backgroundColor: 'rgba(0, 209, 255, 0.1)', borderColor: 'rgba(0, 209, 255, 0.25)' }]}>
            <Text style={styles.heroLabel}>Latest</Text>
            <Text style={[styles.heroValueLarge, { color: colors.cyan }]}>{Math.round(latest)}%</Text>
            <View style={styles.trendRow}>
              {isUp ? <TrendingUp size={14} color="#22C55E" /> : <TrendingDown size={14} color="#EF4444" />}
              <Text style={[styles.trendText, { color: isUp ? '#22C55E' : '#EF4444' }]}>
                {isUp ? '+' : ''}{trendDelta}%
              </Text>
            </View>
          </View>
          {bestMonth && (
            <View style={[styles.heroCard, { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderColor: 'rgba(255, 215, 0, 0.25)' }]}>
              <Text style={styles.heroLabel}>Peak Month</Text>
              <Text style={[styles.heroValue, { color: GOLD }]}>{Math.round(bestMonth.adherence_pct)}%</Text>
              <Text style={[styles.heroMonth, { color: colors.textMuted }]}>{getFullMonthYear(bestMonth.month)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Chart */}
      {hasData && (
        <View onLayout={onLayout}>
          {width > 0 && (
            <Svg width={width} height={CHART_H}>
              {/* Gradient fill under the line */}
              <Defs>
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={colors.cyan} stopOpacity="0.25" />
                  <Stop offset="100%" stopColor={colors.cyan} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Horizontal grid lines */}
              {GRID_LINES.map((pct) => (
                <Line
                  key={pct}
                  x1={PAD_LEFT}
                  y1={toY(pct)}
                  x2={width - PAD_RIGHT}
                  y2={toY(pct)}
                  stroke={colors.border}
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />
              ))}

              {/* Area fill */}
              {entries.length > 1 && (
                <Path d={areaPath} fill="url(#areaGrad)" />
              )}

              {/* Line */}
              <Polyline
                points={points}
                fill="none"
                stroke={colors.cyan}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Data point dots */}
              {entries.map((e, i) => (
                <React.Fragment key={i}>
                  {e.is_perfect_month && (
                    <Circle
                      cx={toX(i)}
                      cy={toY(e.adherence_pct)}
                      r={8}
                      fill={GOLD}
                      opacity={0.2}
                    />
                  )}
                  <Circle
                    cx={toX(i)}
                    cy={toY(e.adherence_pct)}
                    r={4.5}
                    fill={e.is_perfect_month ? GOLD : colors.cyan}
                    stroke={colors.bg}
                    strokeWidth={2}
                  />
                </React.Fragment>
              ))}
            </Svg>
          )}

          {/* Y-axis labels */}
          {width > 0 &&
            GRID_LINES.map((pct) => (
              <Text
                key={`y-${pct}`}
                style={[styles.yLabel, { color: colors.textPrimary, top: toY(pct) - 6 }]}
              >
                {pct}%
              </Text>
            ))}

          {/* X-axis labels — no year suffix since year nav handles it */}
          {width > 0 && (
            <View style={[styles.xLabels, { marginLeft: PAD_LEFT, marginRight: PAD_RIGHT }]}>
              {entries.map((e, i) => {
                const showLabel = i === 0 || i === entries.length - 1 || (entries.length <= 6) || (i % 2 === 0);
                return (
                  <Text
                    key={i}
                    style={[styles.xLabel, { color: colors.textPrimary }, !showLabel && styles.xLabelHidden]}
                    numberOfLines={1}
                  >
                    {showLabel ? getMonthLabel(e.month) : ''}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  // Year navigator
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  yearArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowDisabled: {
    opacity: 0.3,
  },
  yearLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Hero
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroValueLarge: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroMonth: {
    fontSize: 11,
    fontWeight: '500',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Chart
  yLabel: {
    position: 'absolute',
    left: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  xLabelHidden: {
    opacity: 0,
  },
});
