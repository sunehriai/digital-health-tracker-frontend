import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { insightTrendsService } from '../../data/services/insightTrendsService';
import type { DayOfWeekEntry } from '../../domain/types';

interface DayOfWeekCardProps {
  entries: DayOfWeekEntry[];
}

const CAPSULE_W = 130;
const CAPSULE_H = 40;
const HALF_RADIUS = CAPSULE_H / 2;
const SCATTER_HEIGHT = 370;
const MAX_ROTATION = 12; // degrees (reduced to prevent overlap)

/**
 * Generate guaranteed non-overlapping positions using a staggered grid.
 * Each capsule gets its own row. Alternating rows are offset horizontally
 * to create a natural scattered look without any overlap risk.
 */
function generateRandomLayouts(count: number): { x: number; y: number; rot: number }[] {
  if (count === 0) return [];

  // Each capsule needs ~55px vertical space (40px height + 15px gap)
  const ROW_H = 52;
  const layouts: { x: number; y: number; rot: number }[] = [];

  for (let i = 0; i < count; i++) {
    // Stagger: even rows left-ish, odd rows right-ish
    const isOdd = i % 2 === 1;
    // Add randomness within safe bounds
    const xMin = isOdd ? 25 : 0;
    const xMax = isOdd ? 55 : 30;
    const xPct = xMin + Math.random() * (xMax - xMin);

    const y = i * ROW_H + Math.random() * 6; // slight vertical jitter
    const rot = Math.round((Math.random() - 0.5) * MAX_ROTATION * 2);

    layouts.push({ x: Math.round(xPct), y: Math.round(y), rot });
  }

  return layouts;
}

function getCapsuleColors(pct: number, hasData: boolean): { left: string; right: string } {
  if (!hasData) return { left: '#555', right: '#3a3a3a' };
  if (pct >= 90) return { left: '#00E5CC', right: '#00B8A3' };
  if (pct >= 80) return { left: '#34D399', right: '#10B981' };
  if (pct >= 50) return { left: '#FBBF24', right: '#F59E0B' };
  return { left: '#C08080', right: '#A06868' };
}

/** Format date string "YYYY-MM-DD" to short label like "3/9" */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Compute the Sun–Sat week range label from a weekOffset (0=current, -1=last, etc.) */
function getWeekRangeLabel(weekOffset: number): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Sunday of current week
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek + weekOffset * 7);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const fMonth = MONTHS[sunday.getMonth()];
  const lMonth = MONTHS[saturday.getMonth()];
  const year = saturday.getFullYear();
  if (fMonth === lMonth) {
    return `${fMonth} ${sunday.getDate()} - ${saturday.getDate()}, ${year}`;
  }
  return `${fMonth} ${sunday.getDate()} - ${lMonth} ${saturday.getDate()}, ${year}`;
}

function Capsule({
  entry,
  layout,
}: {
  entry: DayOfWeekEntry;
  layout: { x: number; y: number; rot: number };
}) {
  const hasData = entry.total > 0;
  const { left, right } = getCapsuleColors(entry.adherence_pct, hasData);
  const pctText = hasData ? `${Math.round(entry.adherence_pct)}%` : '—';
  // Show short day name + date, e.g. "Mon 3/10"
  const shortDay = entry.day.slice(0, 3);
  const dateLabel = entry.date ? formatShortDate(entry.date) : '';
  const label = dateLabel ? `${shortDay} ${dateLabel}` : shortDay;

  return (
    <View
      style={[
        styles.capsuleWrapper,
        {
          left: `${layout.x}%`,
          top: layout.y,
          transform: [{ rotate: `${layout.rot}deg` }],
        },
      ]}
    >
      <View style={styles.capsule}>
        <View style={[styles.capsuleLeft, { backgroundColor: left }]}>
          <View style={styles.shineLeft} />
          <Text style={styles.capsuleDay}>{label}</Text>
        </View>
        <View style={[styles.capsuleRight, { backgroundColor: right }]}>
          <View style={styles.shineRight} />
          <Text style={styles.capsulePct}>{pctText}</Text>
        </View>
        <View style={styles.capsuleSeam} />
      </View>
      <View style={[styles.capsuleShadow, { backgroundColor: left }]} />
    </View>
  );
}

export default function DayOfWeekCard({ entries: initialEntries }: DayOfWeekCardProps) {
  const { colors } = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);

  // Use initial entries only if they have the date field, otherwise fetch fresh
  useEffect(() => {
    if (weekOffset === 0 && initialEntries.length > 0 && initialEntries[0].date) {
      setEntries(initialEntries);
      return;
    }
    let cancelled = false;
    setLoading(true);
    insightTrendsService
      .getTrends(true, weekOffset)
      .then((resp) => {
        if (!cancelled) setEntries(resp.day_of_week);
      })
      .catch(() => {
        // Fallback to initial entries if fetch fails
        if (!cancelled && weekOffset === 0) setEntries(initialEntries);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [weekOffset, initialEntries]);

  const visibleEntries = entries.filter((e) => e.total > 0);
  const layouts = useMemo(() => generateRandomLayouts(visibleEntries.length), [visibleEntries.length, weekOffset]);

  const weekLabel = getWeekRangeLabel(weekOffset);
  const isCurrentWeek = weekOffset === 0;
  const canGoBack = weekOffset > -3;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Day of Week</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Navigate up to 4 weeks</Text>

      {/* Week navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => canGoBack && setWeekOffset((o) => o - 1)}
          disabled={!canGoBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.navBtn, !canGoBack && { opacity: 0.25 }]}
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
          {isCurrentWeek ? `This Week  ·  ${weekLabel}` : weekLabel}
        </Text>

        <TouchableOpacity
          onPress={() => !isCurrentWeek && setWeekOffset((o) => o + 1)}
          disabled={isCurrentWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.navBtn, isCurrentWeek && { opacity: 0.25 }]}
        >
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.scatterArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      ) : (
        <View style={styles.scatterArea}>
          {visibleEntries.map((entry, i) => (
            <Capsule
              key={entry.date || entry.day}
              entry={entry}
              layout={layouts[i] ?? { x: 0, y: 0, rot: 0 }}
            />
          ))}
          {visibleEntries.length === 0 && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No data for this week</Text>
            </View>
          )}
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
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 1,
  },
  hint: {
    fontSize: 13,
    marginBottom: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  navBtn: {
    padding: 4,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scatterArea: {
    height: SCATTER_HEIGHT,
    position: 'relative',
  },
  capsuleWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  capsule: {
    width: CAPSULE_W,
    height: CAPSULE_H,
    flexDirection: 'row',
    borderRadius: HALF_RADIUS,
    overflow: 'hidden',
  },
  capsuleLeft: {
    width: CAPSULE_W / 2,
    height: CAPSULE_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleRight: {
    width: CAPSULE_W / 2,
    height: CAPSULE_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shineLeft: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: CAPSULE_W / 2 - 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  shineRight: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: CAPSULE_W / 2 - 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  capsuleSeam: {
    position: 'absolute',
    left: CAPSULE_W / 2 - 0.5,
    top: 0,
    width: 1,
    height: CAPSULE_H,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  capsuleDay: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  capsulePct: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111',
    letterSpacing: 0.5,
  },
  capsuleShadow: {
    width: CAPSULE_W - 10,
    height: 4,
    borderRadius: 2,
    opacity: 0.15,
    marginTop: 3,
  },
});
