// Chip grid layout with modal overlays for individual reports.
// Design reference: Screenshots/Figma/insight-trends.png
// Card 1 (Day of Week) is always active. Cards 2-5 require Tier 4+.
// Locked chips show dimmed with lock icon + "Locked" text.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  AlertTriangle,
  Flame,
  Lock,
  X,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGamification } from '../hooks/useGamification';
import { useInsightTrends } from '../hooks/useInsightTrends';
import { TIER_THRESHOLDS } from '../../domain/constants/tierAssets';
import DayOfWeekCard from '../components/DayOfWeekCard';
import TimeOfDayCard from '../components/TimeOfDayCard';
import YearlyTrendCard from '../components/YearlyTrendCard';
import NeedsAttentionCard from '../components/NeedsAttentionCard';
import StreakTrajectoryCard from '../components/StreakTrajectoryCard';
import type { InsightTrendsResponse, QuickStatsResponse, YearlyTrendResponse } from '../../domain/types';
import QuickStatsCard from '../components/QuickStatsCard';
import { adherenceCalendarService } from '../../data/services/adherenceCalendarService';
import { insightTrendsService } from '../../data/services/insightTrendsService';

type ReportId = 'day_of_week' | 'time_of_day' | 'yearly_trend' | 'needs_attention' | 'streak_trajectory';

interface ChipDef {
  id: ReportId;
  title: string;
  iconColor: string;
  iconBg: string;
  cardBg: string;
  borderColor: string;
  renderIcon: (color: string, size: number) => React.ReactNode;
  tierGated: boolean;
}

const CHIP_GAP = 8;
const SCREEN_PAD = 12;

// ─── Icon colors per chip (matching Figma) ────────────────────────────────────

const CHIP_COLORS = {
  day_of_week:      { icon: '#22C55E', iconBg: 'rgba(34, 197, 94, 0.18)',  cardBg: 'rgba(34, 197, 94, 0.08)',  border: 'rgba(34, 197, 94, 0.25)' },
  time_of_day:      { icon: '#3B82F6', iconBg: 'rgba(59, 130, 246, 0.18)', cardBg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)' },
  yearly_trend:     { icon: '#00D1FF', iconBg: 'rgba(0, 209, 255, 0.18)',  cardBg: 'rgba(0, 209, 255, 0.08)',  border: 'rgba(0, 209, 255, 0.25)' },
  needs_attention:  { icon: '#EF4444', iconBg: 'rgba(239, 68, 68, 0.18)',  cardBg: 'rgba(239, 68, 68, 0.08)',  border: 'rgba(239, 68, 68, 0.25)' },
  streak_trajectory:{ icon: '#F59E0B', iconBg: 'rgba(245, 158, 11, 0.18)', cardBg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)' },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPreview(id: ReportId, data: InsightTrendsResponse | null, tierUnlocked: boolean): string {
  if (!data) return '—';

  switch (id) {
    case 'day_of_week': {
      if (!data.day_of_week?.length) return 'No data yet';
      const withData = data.day_of_week.filter((e) => e.total > 0);
      if (!withData.length) return 'No data yet';
      const best = withData.reduce((a, b) => (a.adherence_pct > b.adherence_pct ? a : b));
      return `Best: ${best.day}`;
    }
    case 'time_of_day': {
      if (!tierUnlocked) return '';
      const tod = data.time_of_day;
      if (!tod) return 'No data yet';
      const slots = [
        { name: 'Morning', stats: tod.morning },
        { name: 'Afternoon', stats: tod.afternoon },
        { name: 'Evening', stats: tod.evening },
        { name: 'Night', stats: tod.night },
      ].filter((s) => s.stats !== null);
      if (!slots.length) return 'No data yet';
      const best = slots.reduce((a, b) => (a.stats!.percentage > b.stats!.percentage ? a : b));
      return `Best: ${best.name} ${Math.round(best.stats!.percentage)}%`;
    }
    case 'yearly_trend': {
      if (!tierUnlocked) return '';
      if (!data.yearly_trend?.length) return 'No data yet';
      const latest = data.yearly_trend[data.yearly_trend.length - 1];
      return `Latest: ${Math.round(latest.adherence_pct)}%`;
    }
    case 'needs_attention': {
      if (!tierUnlocked) return '';
      if (!data.needs_attention || data.needs_attention.length === 0) return 'All on track';
      const count = data.needs_attention.length + (data.needs_attention_overflow ?? 0);
      return `${count} need${count === 1 ? 's' : ''} focus`;
    }
    case 'streak_trajectory': {
      if (!tierUnlocked) return '';
      if (!data.streak_trajectory?.length) return 'No data yet';
      const best = data.streak_trajectory.reduce((a, b) => (a.best_streak > b.best_streak ? a : b));
      return `Best: ${best.best_streak} days`;
    }
    default:
      return '—';
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonChip({ size }: { size: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: 16, backgroundColor: colors.bgElevated, opacity }}
    />
  );
}

// ─── Lock Toast ───────────────────────────────────────────────────────────────

function LockToast({ visible, xpNeeded }: { visible: boolean; xpNeeded: number }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(60)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 60, duration: 300, useNativeDriver: true }),
            Animated.timing(fadeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 1800);
      });
    }
  }, [visible, translateY, fadeOpacity]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.bgElevated, borderColor: colors.border, transform: [{ translateY }], opacity: fadeOpacity },
      ]}
      pointerEvents="none"
    >
      <Lock size={12} color="#FFD700" />
      <Text style={[styles.toastText, { color: colors.textSecondary }]}>
        {xpNeeded > 0 ? `${xpNeeded.toLocaleString()} XP to unlock` : 'Reach Tier 4 to unlock'}
      </Text>
    </Animated.View>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function EmptyReport({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyReport}>
      <Text style={[styles.emptyReportText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

function ReportModal({
  visible,
  reportId,
  data,
  onClose,
}: {
  visible: boolean;
  reportId: ReportId | null;
  data: InsightTrendsResponse | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  // ─── Yearly trend year navigation state ──────────────────────────────
  const currentYear = new Date().getFullYear();
  const [ytYear, setYtYear] = useState(currentYear);
  const [ytData, setYtData] = useState<YearlyTrendResponse | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  // Reset to current year when modal opens for yearly_trend
  useEffect(() => {
    if (visible && reportId === 'yearly_trend') {
      setYtYear(currentYear);
      setYtData(null);
    }
  }, [visible, reportId, currentYear]);

  // Fetch yearly trend data when year changes
  useEffect(() => {
    if (!visible || reportId !== 'yearly_trend') return;
    let cancelled = false;
    setYtLoading(true);
    insightTrendsService
      .getYearlyTrend(ytYear)
      .then((res) => { if (!cancelled) setYtData(res); })
      .catch((err) => console.error('[YearlyTrend] Fetch error:', err))
      .finally(() => { if (!cancelled) setYtLoading(false); });
    return () => { cancelled = true; };
  }, [visible, reportId, ytYear]);

  if (!reportId || !data) return null;

  const titles: Record<ReportId, string> = {
    day_of_week: 'Day of Week',
    time_of_day: 'Time of Day',
    yearly_trend: 'Yearly Adherence',
    needs_attention: 'Needs Attention',
    streak_trajectory: 'Streak Trajectory',
  };

  const subtitles: Record<ReportId, string> = {
    day_of_week: 'Your adherence patterns across the week',
    time_of_day: 'Performance breakdown by time slot',
    yearly_trend: 'Navigate between years to compare progress',
    needs_attention: 'Medications requiring your focus',
    streak_trajectory: 'Best consecutive streak per month (last 6 months)',
  };

  const accentColor = CHIP_COLORS[reportId]?.icon ?? colors.cyan;

  const renderIcon = () => {
    const size = 20;
    switch (reportId) {
      case 'day_of_week': return <CalendarDays size={size} color={accentColor} />;
      case 'time_of_day': return <Clock size={size} color={accentColor} />;
      case 'yearly_trend': return <TrendingUp size={size} color={accentColor} />;
      case 'needs_attention': return <AlertTriangle size={size} color={accentColor} />;
      case 'streak_trajectory': return <Flame size={size} color={accentColor} />;
      default: return null;
    }
  };

  const renderContent = () => {
    switch (reportId) {
      case 'day_of_week':
        return data.day_of_week?.length
          ? <DayOfWeekCard entries={data.day_of_week} />
          : <EmptyReport message="Keep logging doses to see your day-of-week pattern" />;
      case 'time_of_day':
        return data.time_of_day
          ? <TimeOfDayCard data={data.time_of_day} />
          : <EmptyReport message="Not enough data yet — keep logging doses" />;
      case 'yearly_trend': {
        // Once ytData has been fetched, use it exclusively (even if entries is null = no data for that year)
        const entries = ytData !== null ? ytData.entries : data.yearly_trend;
        const minYear = ytData?.min_year ?? currentYear - 3;
        const maxYear = ytData?.max_year ?? currentYear;
        return entries?.length
          ? <YearlyTrendCard
              entries={entries}
              year={ytYear}
              minYear={minYear}
              maxYear={maxYear}
              onYearChange={setYtYear}
              loading={ytLoading}
            />
          : <View>
              <YearlyTrendCard
                entries={[]}
                year={ytYear}
                minYear={minYear}
                maxYear={maxYear}
                onYearChange={setYtYear}
                loading={ytLoading}
              />
              {!ytLoading && <EmptyReport message={`No adherence data for ${ytYear}`} />}
            </View>;
      }
      case 'needs_attention':
        return <NeedsAttentionCard entries={data.needs_attention} overflow={data.needs_attention_overflow} />;
      case 'streak_trajectory':
        return data.streak_trajectory?.length
          ? <StreakTrajectoryCard entries={data.streak_trajectory} />
          : <EmptyReport message="Keep logging to build your streak data" />;
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalSpacer} />
        <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.bg }]}>
          {/* Drag handle */}
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragHandle, { backgroundColor: colors.textMuted }]} />
          </View>

          {/* Modal header with icon + accent bar */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIconBg, { backgroundColor: `${accentColor}22` }]}>
                {renderIcon()}
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {titles[reportId]}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {subtitles[reportId]}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.modalCloseBtn, { backgroundColor: colors.bgElevated }]}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Accent divider */}
          <View style={[styles.modalAccent, { backgroundColor: accentColor }]} />

          {/* Modal body */}
          <ScrollView contentContainerStyle={styles.modalBody} bounces={false}>
            {renderContent()}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InsightTrendsScreen() {
  const { colors } = useTheme();
  const { totalXp } = useGamification();
  const { data, loading, error, isOnline, refresh } = useInsightTrends();

  const tierUnlocked = data?.tier_unlocked ?? false;
  const xpToTier4 = Math.max(0, (TIER_THRESHOLDS[4] ?? 2500) - totalXp);

  const [activeModal, setActiveModal] = useState<ReportId | null>(null);
  const [showLockToast, setShowLockToast] = useState(false);
  const lockToastKey = useRef(0);

  // Quick stats
  const [quickStats, setQuickStats] = useState<QuickStatsResponse | null>(null);
  const [quickStatsLoading, setQuickStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setQuickStatsLoading(true);
    adherenceCalendarService
      .getQuickStats()
      .then((d) => { if (!cancelled) setQuickStats(d); })
      .catch((err) => console.error('[QuickStats] Fetch error:', err))
      .finally(() => { if (!cancelled) setQuickStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Chip sizing: 2 columns, full width but compact height
  const screenW = Dimensions.get('window').width;
  const chipWidth = (screenW - SCREEN_PAD * 2 - CHIP_GAP) / 2;
  const chipHeight = chipWidth * 0.6;

  const chipDefs: ChipDef[] = useMemo(
    () => [
      {
        id: 'day_of_week', title: 'Day of Week', tierGated: false,
        iconColor: CHIP_COLORS.day_of_week.icon, iconBg: CHIP_COLORS.day_of_week.iconBg,
        cardBg: CHIP_COLORS.day_of_week.cardBg, borderColor: CHIP_COLORS.day_of_week.border,
        renderIcon: (c, s) => <CalendarDays size={s} color={c} />,
      },
      {
        id: 'time_of_day', title: 'Time of Day', tierGated: true,
        iconColor: CHIP_COLORS.time_of_day.icon, iconBg: CHIP_COLORS.time_of_day.iconBg,
        cardBg: CHIP_COLORS.time_of_day.cardBg, borderColor: CHIP_COLORS.time_of_day.border,
        renderIcon: (c, s) => <Clock size={s} color={c} />,
      },
      {
        id: 'yearly_trend', title: 'Yearly Trend', tierGated: true,
        iconColor: CHIP_COLORS.yearly_trend.icon, iconBg: CHIP_COLORS.yearly_trend.iconBg,
        cardBg: CHIP_COLORS.yearly_trend.cardBg, borderColor: CHIP_COLORS.yearly_trend.border,
        renderIcon: (c, s) => <TrendingUp size={s} color={c} />,
      },
      {
        id: 'needs_attention', title: 'Needs Attention', tierGated: true,
        iconColor: CHIP_COLORS.needs_attention.icon, iconBg: CHIP_COLORS.needs_attention.iconBg,
        cardBg: CHIP_COLORS.needs_attention.cardBg, borderColor: CHIP_COLORS.needs_attention.border,
        renderIcon: (c, s) => <AlertTriangle size={s} color={c} />,
      },
      {
        id: 'streak_trajectory', title: 'Streak Trajectory', tierGated: true,
        iconColor: CHIP_COLORS.streak_trajectory.icon, iconBg: CHIP_COLORS.streak_trajectory.iconBg,
        cardBg: CHIP_COLORS.streak_trajectory.cardBg, borderColor: CHIP_COLORS.streak_trajectory.border,
        renderIcon: (c, s) => <Flame size={s} color={c} />,
      },
    ],
    [],
  );

  const handleChipPress = useCallback(
    (chip: ChipDef) => {
      if (chip.tierGated && !tierUnlocked) {
        lockToastKey.current += 1;
        setShowLockToast(false);
        setTimeout(() => setShowLockToast(true), 10);
        return;
      }
      setActiveModal(chip.id);
    },
    [tierUnlocked],
  );

  // Split chips: first 4 in grid, 5th centered below
  const gridChips = chipDefs.slice(0, 4);
  const lastChip = chipDefs[4];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Insight Trends</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Discover patterns in your medication routine
        </Text>
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.bgElevated }]}>
          <WifiOff size={14} color={colors.warning} />
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            Showing cached data — pull to refresh
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.cyan} />
        }
      >
        {/* Quick Stats */}
        <QuickStatsCard stats={quickStats} loading={quickStatsLoading} />

        {/* Loading skeletons */}
        {loading && !data && (
          <View style={styles.chipGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonChip key={i} size={chipWidth} />
            ))}
          </View>
        )}

        {/* Error state */}
        {error && !data && !loading && (
          <View style={[styles.errorCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.cyanDim }]}
              onPress={refresh}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={colors.cyan} />
              <Text style={[styles.retryText, { color: colors.cyan }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chip grid — 2×2 */}
        {data && (
          <>
            <View style={styles.chipGrid}>
              {gridChips.map((chip) => {
                const locked = chip.tierGated && !tierUnlocked;
                const preview = locked ? '' : getPreview(chip.id, data, tierUnlocked);
                const glowColor = locked ? 'transparent' : chip.iconColor;

                return (
                  <TouchableOpacity
                    key={chip.id}
                    activeOpacity={locked ? 0.5 : 0.8}
                    onPress={() => handleChipPress(chip)}
                    style={[
                      styles.chip,
                      {
                        width: chipWidth,
                        height: chipHeight,
                        backgroundColor: locked ? colors.bgCard : chip.cardBg,
                        borderColor: locked ? colors.borderSubtle : chip.borderColor,
                      },
                      !locked && {
                        shadowColor: chip.iconColor,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        elevation: 8,
                      },
                      locked && styles.chipLocked,
                    ]}
                  >
                    {/* Tinted icon background with glow */}
                    <View style={[
                      styles.iconBg,
                      { backgroundColor: locked ? colors.bgElevated : chip.iconBg },
                      !locked && {
                        shadowColor: chip.iconColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}>
                      {chip.renderIcon(locked ? colors.textMuted : chip.iconColor, 24)}
                    </View>

                    {/* Title */}
                    <Text
                      style={[styles.chipTitle, { color: locked ? colors.textMuted : colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {chip.title}
                    </Text>

                    {/* Preview or Locked */}
                    {locked ? (
                      <View style={styles.lockedRow}>
                        <Lock size={10} color={colors.textMuted} />
                        <Text style={[styles.chipPreview, { color: colors.textMuted }]}>Locked</Text>
                      </View>
                    ) : (
                      <Text style={[styles.chipPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                        {preview}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5th chip — centered, wider */}
            {lastChip && (() => {
              const locked = lastChip.tierGated && !tierUnlocked;
              const preview = locked ? '' : getPreview(lastChip.id, data, tierUnlocked);
              const glowColor = locked ? 'transparent' : lastChip.iconColor;

              return (
                <View style={styles.lastChipRow}>
                  <TouchableOpacity
                    activeOpacity={locked ? 0.5 : 0.8}
                    onPress={() => handleChipPress(lastChip)}
                    style={[
                      styles.chip,
                      styles.lastChip,
                      {
                        height: chipHeight,
                        backgroundColor: locked ? colors.bgCard : lastChip.cardBg,
                        borderColor: locked ? colors.borderSubtle : lastChip.borderColor,
                      },
                      !locked && {
                        shadowColor: lastChip.iconColor,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        elevation: 8,
                      },
                      locked && styles.chipLocked,
                    ]}
                  >
                    <View style={[
                      styles.iconBg,
                      { backgroundColor: locked ? colors.bgElevated : lastChip.iconBg },
                      !locked && {
                        shadowColor: lastChip.iconColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}>
                      {lastChip.renderIcon(locked ? colors.textMuted : lastChip.iconColor, 24)}
                    </View>
                    <Text
                      style={[styles.chipTitle, { color: locked ? colors.textMuted : colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {lastChip.title}
                    </Text>
                    {locked ? (
                      <View style={styles.lockedRow}>
                        <Lock size={10} color={colors.textMuted} />
                        <Text style={[styles.chipPreview, { color: colors.textMuted }]}>Locked</Text>
                      </View>
                    ) : (
                      <Text style={[styles.chipPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                        {preview}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Unlock hint for Tier 1-3 */}
            {!tierUnlocked && (
              <View style={styles.unlockHint}>
                <Lock size={12} color={colors.textMuted} />
                <Text style={[styles.unlockHintText, { color: colors.textMuted }]}>
                  {xpToTier4 > 0
                    ? `${xpToTier4.toLocaleString()} XP to unlock all insights`
                    : 'Reach Tier 4 to unlock'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Report modal */}
      <ReportModal
        visible={activeModal !== null}
        reportId={activeModal}
        data={data}
        onClose={() => setActiveModal(null)}
      />

      {/* Lock toast */}
      <LockToast key={lockToastKey.current} visible={showLockToast} xpNeeded={xpToTier4} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 12,
  },
  content: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 16,
    paddingBottom: 32,
  },
  // Chip grid — 2×2
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CHIP_GAP,
  },
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 6,
  },
  chipLocked: {
    opacity: 0.55,
  },
  lastChipRow: {
    marginTop: CHIP_GAP,
    alignItems: 'center',
  },
  lastChip: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipPreview: {
    fontSize: 11,
    fontWeight: '500',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Unlock hint
  unlockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  unlockHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Error state
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Empty report
  emptyReport: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyReportText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal — small top tap-to-dismiss, large bottom content
  modalOverlay: {
    flex: 1,
  },
  modalSpacer: {
    flex: 0.4,
  },
  modalContent: {
    flex: 3.6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAccent: {
    height: 2,
    marginHorizontal: 20,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 8,
  },
  modalBody: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
