import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing as REasing,
} from 'react-native-reanimated';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Activity, Check, Clock, Flame, Shield, Star, X } from 'lucide-react-native';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/ThemeContext';
import { adherenceWeeklyService } from '../../data/services/adherenceWeeklyService';
import { medicationEvents } from '../../data/utils/medicationEvents';
import type {
  WeekDayRecord,
  WeeklyAdherenceResponse,
} from '../../domain/types';

// --- Constants ---

const BAR_MAX_HEIGHT = 100;
const BAR_WIDTH = 28;
const BAR_MIN_HEIGHT = 14; // visible stub for 0% days with scheduled doses

// --- Props ---

interface AdherenceCardProps {
  streakDays: number;
  currentTier: number;
  waiverBadges?: number;
  waiverJustUsed?: boolean;
  onWaiverPress?: () => void;
}

// --- Helpers ---

/** Pick gradient colors [bottom, top] for each bar. Uses theme colors. */
function getBarGradient(
  day: WeekDayRecord,
  isDark: boolean,
  themeColors: ColorPalette,
): [string, string] {
  if (day.total_scheduled === 0) {
    const c = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    return [c, c];
  }
  const completedCount =
    day.taken_count + day.taken_late_count + day.missed_count;
  if (completedCount === 0) {
    const c = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    return [c, c];
  }
  // Any late doses → warning gradient
  if (day.taken_late_count > 0) return [themeColors.warning, `${themeColors.warning}AA`];
  // All taken on time → chart accent gradient (deep to bright)
  if (day.taken_count === day.total_scheduled) return [themeColors.chartAccentDeep, themeColors.chartAccent];
  // Mix of taken + missed → muted chart accent gradient
  if (day.taken_count > 0) return [`${themeColors.chartAccentDeep}80`, `${themeColors.chartAccent}80`];
  // All missed → subtle grey
  return isDark
    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)']
    : ['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.14)'];
}

// --- Sub-components ---

function TodayPulseWrapper({ children, isToday, pulseColor }: { children: React.ReactNode; isToday: boolean; pulseColor: string }) {
  const { prefs } = useAppPreferences();
  const pulseOpacity = useSharedValue(0.3);
  const pulseRadius = useSharedValue(6);

  useEffect(() => {
    if (isToday && !prefs.reducedMotion) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
          withTiming(0.3, { duration: 1500, easing: REasing.inOut(REasing.ease) })
        ),
        -1,
        true
      );
      pulseRadius.value = withRepeat(
        withSequence(
          withTiming(14, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
          withTiming(6, { duration: 1500, easing: REasing.inOut(REasing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isToday, prefs.reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowColor: pulseColor,
    shadowOpacity: isToday ? pulseOpacity.value : 0,
    shadowRadius: isToday ? pulseRadius.value : 0,
    shadowOffset: { width: 0, height: 0 },
  }));

  if (!isToday) return <>{children}</>;

  return <ReAnimated.View style={[animatedStyle, { width: '100%' }]}>{children}</ReAnimated.View>;
}

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
  const targetHeight = hasScheduled
    ? Math.max(BAR_MIN_HEIGHT, (pct / 100) * BAR_MAX_HEIGHT)
    : BAR_MIN_HEIGHT;

  const hasDoses = day.taken_count + day.taken_late_count + day.missed_count > 0;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: 600,
      delay: index * 80,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: false,
    }).start();
  }, [targetHeight]);

  const [gradientBottom, gradientTop] = getBarGradient(day, isDark, colors);

  return (
    <View style={styles.barColumnContainer}>
      <View style={styles.barTrack}>
        <TodayPulseWrapper isToday={isToday && hasDoses} pulseColor={colors.chartAccent}>
          <Animated.View
            style={[
              styles.bar,
              {
                height: heightAnim,
                overflow: 'hidden',
                // Glow effect on bars with doses (no elevation — it adds a white backdrop on Android)
                ...(hasDoses && {
                  shadowColor: colors.cyan,
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }),
                ...(isToday && hasDoses && {
                  shadowColor: colors.chartAccent,
                  shadowOpacity: 0.6,
                  shadowRadius: 10,
                }),
                ...(isToday && { borderWidth: 1.5, borderColor: `${colors.chartAccent}99` }),
              },
            ]}
          >
            {/* Gradient fill */}
            <LinearGradient
              colors={[gradientTop, gradientBottom]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Glass highlight strip on left edge */}
            {hasDoses && (
              <View
                style={{
                  position: 'absolute',
                  left: 2,
                  top: 4,
                  bottom: 4,
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                }}
              />
            )}
          </Animated.View>
        </TodayPulseWrapper>
      </View>
      <Text
        style={[
          styles.dayLabel,
          { color: colors.textSecondary },
          isToday && { color: colors.chartAccent, fontWeight: '700' },
        ]}
      >
        {day.date
          ? `${new Date(day.date + 'T12:00:00').getMonth() + 1}/${new Date(day.date + 'T12:00:00').getDate()}`
          : ''}
      </Text>
    </View>
  );
}

function WeeklyPerfectBar({ days }: { days: WeekDayRecord[] }) {
  const { colors, isDark } = useTheme();
  const fillAnim = useRef(new Animated.Value(0)).current;

  // Count days with 100% adherence (only past/today days that have doses)
  const perfectDays = days.filter(
    (d) => d.total_scheduled > 0 && d.adherence_pct === 100
  ).length;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(perfectDays / 7, 1),
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [perfectDays]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.weeklyPerfectContainer}>
      <View style={styles.weeklyPerfectLabelRow}>
        <Flame size={14} color={colors.chartAccent} fill={colors.chartAccent} />
        <Text style={[styles.weeklyPerfectLabel, { color: colors.textSecondary }]}>
          Streak days
        </Text>
        <Text style={[styles.weeklyPerfectCount, { color: colors.chartAccent }]}>
          {perfectDays}/7
        </Text>
      </View>
      <View style={[styles.weeklyPerfectTrack, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }]}>
        <Animated.View style={[styles.weeklyPerfectFillOuter, { width: fillWidth }]}>
          <LinearGradient
            colors={[colors.chartAccentDeep, colors.chartAccent, `${colors.chartAccent}AA`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
          />
          <View style={styles.weeklyPerfectGlass} />
        </Animated.View>
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
        <Check size={14} color={colors.success} />
        <Text style={[styles.footerCount, { color: colors.success }]}>
          {taken}
        </Text>
      </View>
      <View style={styles.footerItem}>
        <Clock size={14} color={colors.warning} />
        <Text style={[styles.footerCount, { color: colors.warning }]}>{late}</Text>
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
  waiverBadges = 0,
  waiverJustUsed = false,
  onWaiverPress,
}: AdherenceCardProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [weekData, setWeekData] = useState<WeeklyAdherenceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // Listen for dose_taken / dose_reverted events to refresh the chart
  useEffect(() => {
    const onDoseChange = () => setRefreshToken((t) => t + 1);
    medicationEvents.on('dose_taken', onDoseChange);
    medicationEvents.on('dose_reverted', onDoseChange);
    return () => {
      medicationEvents.off('dose_taken', onDoseChange);
      medicationEvents.off('dose_reverted', onDoseChange);
    };
  }, []);

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
  }, [waiverJustUsed, refreshToken]);

  // Hide card until 7 full days have passed since the user's first medication.
  // Also hide while loading (no data yet) to prevent a brief flash.
  if (loading || !weekData?.sufficient_history) return null;

  // Determine today's local date for highlighting (matches backend's timezone-aware date)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
      trendColor = colors.textMuted;
    } else if (delta < 0) {
      trendText = `▼${Math.abs(delta)}%`;
      trendColor = colors.textMuted;
    } else {
      trendText = '–';
      trendColor = colors.textMuted;
    }
  }

  const adherencePctDisplay =
    weekData?.current_week_adherence_pct != null
      ? `${Math.round(weekData.current_week_adherence_pct)}%`
      : '–%';

  const showWaiverBadge = currentTier >= 3 && waiverBadges > 0;

  // Header badges: remaining badges, still tappable
  const waiverBadgeIcons = showWaiverBadge ? (
    <TouchableOpacity
      style={styles.waiverBadge}
      activeOpacity={0.7}
      onPress={onWaiverPress}
      accessibilityLabel={`${waiverBadges} waiver badge${waiverBadges !== 1 ? 's' : ''} available`}
    >
      {Array.from({ length: waiverBadges }).map((_, i) => (
        <View key={i} style={[styles.waiverIconWrap, i > 0 && { marginLeft: -6 }]}>
          <Shield size={22} color={colors.cyan} fill="transparent" strokeWidth={2.5} />
          <Star size={10} color={colors.cyan} fill={colors.cyan} strokeWidth={0} style={styles.waiverStar} />
        </View>
      ))}
    </TouchableOpacity>
  ) : null;

  // Footer badge: single dimmed "used" badge shown after waiver activation
  const usedBadgeIcon = waiverJustUsed ? (
    <View style={styles.waiverBadge} accessibilityLabel="Waiver badge used">
      <View style={[styles.waiverIconWrap, { opacity: 0.35 }]}>
        <Shield size={22} color={colors.cyan} fill="transparent" strokeWidth={2.5} />
        <Star size={10} color={colors.cyan} fill={colors.cyan} strokeWidth={0} style={styles.waiverStar} />
      </View>
    </View>
  ) : null;

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
          <Activity size={16} color={colors.chartAccent} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            LAST 7 DAYS
          </Text>
        </View>
        <View style={styles.headerRight}>
          {waiverBadgeIcons}
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

      {/* Weekly perfect days bar */}
      <WeeklyPerfectBar days={weekData?.days ?? []} />

      {/* Summary footer */}
      <View style={styles.footerWithWaiver}>
        <SummaryFooter
          taken={weekData?.total_taken ?? 0}
          late={weekData?.total_taken_late ?? 0}
          missed={weekData?.total_missed ?? 0}
        />
        {usedBadgeIcon}
      </View>

      {/* View Month link (Tier 3+) */}
      {currentTier >= 3 && (
        <TouchableOpacity
          style={styles.viewMonthLink}
          onPress={() => navigation.navigate('MyAdherence')}
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
    alignItems: 'center',
    gap: 6,
  },
  waiverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 6,
  },
  waiverIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiverStar: {
    position: 'absolute',
    top: 5,
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
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  weeklyPerfectContainer: {
    marginBottom: 10,
  },
  weeklyPerfectLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  weeklyPerfectLabel: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  weeklyPerfectCount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  weeklyPerfectTrack: {
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyPerfectFillOuter: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyPerfectGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  footerWithWaiver: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewMonthText: {
    fontSize: 14,
    fontWeight: '700',
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
