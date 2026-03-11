import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Activity, Check, Clock, Flame, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/ThemeContext';
import { adherenceWeeklyService } from '../../data/services/adherenceWeeklyService';
import type {
  WeekDayRecord,
  WeeklyAdherenceResponse,
} from '../../domain/types';

// --- Constants ---

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR_MAX_HEIGHT = 100;
const BAR_WIDTH = 28;
const BAR_MIN_HEIGHT = 6; // visible minimum for 0% days with scheduled doses

// --- Props ---

interface AdherenceCardProps {
  streakDays: number;
  currentTier: number;
}

// --- Helpers ---

/** Pick bar color based on the dominant dose status for the day. */
function getBarColor(
  day: WeekDayRecord,
  colors: ColorPalette,
  isDark: boolean
): string {
  if (day.total_scheduled === 0)
    return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  // All future/pending — dim
  const completedCount =
    day.taken_count + day.taken_late_count + day.missed_count;
  if (completedCount === 0)
    return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  // Any late doses → amber
  if (day.taken_late_count > 0) return '#F59E0B';
  // All taken on time → cyan
  if (day.taken_count === day.total_scheduled) return colors.cyan;
  // Mix of taken + missed → dimmed cyan
  if (day.taken_count > 0) return 'rgba(0, 209, 255, 0.5)';
  // All missed → grey
  return isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
}

// --- Sub-components ---

function DayBar({
  day,
  isToday,
  index,
}: {
  day: WeekDayRecord;
  isToday: boolean;
  index: number;
}) {
  const { colors, isDark } = useTheme();
  const heightAnim = useRef(new Animated.Value(0)).current;

  const pct = day.adherence_pct ?? 0;
  const hasScheduled = day.total_scheduled > 0;
  // Bar height: percentage of max, with a visible minimum for days that have doses
  const targetHeight = hasScheduled
    ? Math.max(BAR_MIN_HEIGHT, (pct / 100) * BAR_MAX_HEIGHT)
    : BAR_MIN_HEIGHT;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: 500,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetHeight]);

  const barColor = getBarColor(day, colors, isDark);

  return (
    <View style={styles.barColumnContainer}>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.bar,
            {
              height: heightAnim,
              backgroundColor: barColor,
              ...(isToday && {
                shadowColor: colors.cyan,
                shadowOpacity: 0.4,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
                elevation: 4,
              }),
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.dayLabel,
          { color: colors.textMuted },
          isToday && { color: colors.cyan, fontWeight: '700' },
        ]}
      >
        {DAY_LABELS[index]}
      </Text>
    </View>
  );
}

function StreakBar({ streakDays }: { streakDays: number }) {
  const { colors, isDark } = useTheme();
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fillTo = Math.min(streakDays / 7, 1);
    Animated.timing(fillAnim, {
      toValue: fillTo,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (streakDays >= 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streakDays]);

  if (streakDays === 0) {
    return (
      <View style={styles.streakBarContainer}>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
          No active streak
        </Text>
      </View>
    );
  }

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.streakBarContainer}>
      <View style={styles.streakLabelRow}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Flame size={14} color="#F59E0B" fill="#F59E0B" />
        </Animated.View>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
          {streakDays}-day perfect streak
        </Text>
      </View>
      <View
        style={[
          styles.streakTrack,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.streakFill,
            { width: fillWidth, backgroundColor: colors.cyan },
          ]}
        />
      </View>
    </View>
  );
}

function SummaryFooter({
  taken,
  late,
  missed,
}: {
  taken: number;
  late: number;
  missed: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.footerRow}>
      <View style={styles.footerItem}>
        <Check size={14} color={colors.cyan} />
        <Text style={[styles.footerCount, { color: colors.cyan }]}>
          {taken}
        </Text>
      </View>
      <View style={styles.footerItem}>
        <Clock size={14} color="#F59E0B" />
        <Text style={[styles.footerCount, { color: '#F59E0B' }]}>{late}</Text>
      </View>
      <View style={styles.footerItem}>
        <X size={14} color={colors.error} />
        <Text style={[styles.footerCount, { color: colors.error }]}>
          {missed}
        </Text>
      </View>
    </View>
  );
}

// --- Main Component ---

export default function AdherenceCard({
  streakDays,
  currentTier,
}: AdherenceCardProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [weekData, setWeekData] = useState<WeeklyAdherenceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await adherenceWeeklyService.getWeeklyAdherence();
        if (mounted) {
          setWeekData(data);
          setFetchError(false);
        }
      } catch {
        if (mounted) setFetchError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Determine today's ISO date for highlighting
  const todayStr = new Date().toISOString().split('T')[0];

  // Trend arrow
  let trendText = '–';
  let trendColor: string = colors.textMuted;
  if (
    weekData &&
    weekData.current_week_adherence_pct != null &&
    weekData.prev_week_adherence_pct != null
  ) {
    const delta = Math.round(
      weekData.current_week_adherence_pct - weekData.prev_week_adherence_pct
    );
    if (delta > 0) {
      trendText = `▲${delta}%`;
      trendColor = colors.success;
    } else if (delta < 0) {
      trendText = `▼${Math.abs(delta)}%`;
      trendColor = '#F59E0B';
    } else {
      trendText = '–';
      trendColor = colors.textMuted;
    }
  }

  const adherencePctDisplay =
    weekData?.current_week_adherence_pct != null
      ? `${Math.round(weekData.current_week_adherence_pct)}%`
      : '–%';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgDark,
          borderColor: colors.cyanDim,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={colors.cyan} />
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
            THIS WEEK
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.pctText, { color: colors.textPrimary }]}>
            {adherencePctDisplay}
          </Text>
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendText}
          </Text>
        </View>
      </View>

      {/* Day bars */}
      {loading ? (
        <View style={styles.skeleton}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonBar,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.columnsRow}>
          {(weekData?.days ?? Array.from({ length: 7 }, (_, i) => ({
            date: '',
            slots: [],
            taken_count: 0,
            taken_late_count: 0,
            missed_count: 0,
            pending_count: 0,
            total_scheduled: 0,
            adherence_pct: null,
          }))).map((day, i) => (
            <DayBar
              key={day.date || i}
              day={day}
              isToday={day.date === todayStr}
              index={i}
            />
          ))}
        </View>
      )}

      {/* Streak bar */}
      <StreakBar streakDays={streakDays} />

      {/* Summary footer */}
      <SummaryFooter
        taken={weekData?.total_taken ?? 0}
        late={weekData?.total_taken_late ?? 0}
        missed={weekData?.total_missed ?? 0}
      />

      {/* View Month link (Tier 3+) */}
      {currentTier >= 3 && (
        <TouchableOpacity
          style={styles.viewMonthLink}
          onPress={() =>
            // TODO: Tier 3 — add MyAdherence to RootStackParamList
            (navigation as any).navigate('MyAdherence')
          }
        >
          <Text style={[styles.viewMonthText, { color: colors.cyan }]}>
            View Month →
          </Text>
        </TouchableOpacity>
      )}

      {/* Error state */}
      {fetchError && !loading && (
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Adherence data unavailable
        </Text>
      )}
    </View>
  );
}

// --- Styles (layout-only — colors are applied inline) ---

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  pctText: {
    fontSize: 22,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  barColumnContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
  },
  streakBarContainer: {
    marginBottom: 10,
  },
  streakLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  streakTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewMonthLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  viewMonthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  skeleton: {
    height: BAR_MAX_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  skeletonBar: {
    width: BAR_WIDTH,
    height: 30,
    borderRadius: 6,
  },
});
