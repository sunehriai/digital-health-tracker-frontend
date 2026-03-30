import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, ArrowLeft, WifiOff, Award, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useGamification } from '../hooks/useGamification';
import { useSubscription } from '../hooks/useSubscription';
import { isFeatureUnlocked } from '../../domain/utils/tierGating';
import LockedFeatureScreen from '../components/LockedFeatureScreen';
// RitualTree deferred to V2
import CalendarHeatMap from '../components/CalendarHeatMap';
import DayDetailModal from '../components/DayDetailModal';
import XpGrowthCard from '../components/XpGrowthCard';
import CalendarLegend from '../components/CalendarLegend';
// WeeklyMilestones & MonthlyStatsCard deferred to V2
import MilestoneBanner from '../components/MilestoneBanner';
import { adherenceCalendarService } from '../../data/services/adherenceCalendarService';
import { gamificationService } from '../../data/services/gamificationService';
import { offlineCache } from '../../data/utils/offlineCache';
import { computeStickers } from '../../domain/utils/stickerCalculator';
import {
  currentYearMonth,
  formatMonthLabel,
  isFutureDate,
  nextYearMonth,
  prevYearMonth,
} from '../../domain/utils/calendarUtils';
import type { MonthAdherenceResponse, CalendarDoseRecord, MilestoneInfo, ConsistencyBonusInfo } from '../../domain/types';
import type { RootStackParamList } from '../navigation/types';

/** Milestone display colors by name */
const MILESTONE_COLORS: Record<string, string> = {
  Dedicated: '#CD7F32', // Bronze
  Committed: '#C0C0C0', // Silver
  Devoted: '#FFD700',   // Gold
};

export default function MyAdherenceScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const { currentTier, totalXp, perfectMonthsStreak, loading: gamLoading } = useGamification();
  const { isInTrial, subscriptionEnabled, trialDaysLeft } = useSubscription();

  // Earliest navigable month = account creation month
  const accountStartMonth = useMemo(() => {
    if (!profile?.created_at) return null;
    const d = new Date(profile.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [profile?.created_at]);

  // Month navigation state
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth());
  const [calendarData, setCalendarData] = useState<MonthAdherenceResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Day detail modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Milestones state
  const [milestones, setMilestones] = useState<MilestoneInfo[] | null>(null);
  const [consistencyBonus, setConsistencyBonus] = useState<ConsistencyBonusInfo | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  // Step 45: Trial users bypass tier lock to preview adherence calendar
  const isLocked = !gamLoading && !isFeatureUnlocked('monthly_calendar', currentTier) && !(isInTrial && subscriptionEnabled);

  // Data fetching — only when unlocked
  useEffect(() => {
    if (gamLoading || isLocked) return;
    let cancelled = false;
    const load = async () => {
      // 1. Check cache first
      const cached = await offlineCache.get<MonthAdherenceResponse>(
        `adherence_calendar_${selectedYearMonth}`,
      );
      if (cached && !cancelled) {
        setCalendarData(cached);
        setDataLoading(false);
      } else if (!cancelled) {
        setCalendarData(null);
        setDataLoading(true);
      }

      // 2. Always fetch fresh data
      try {
        const fresh = await adherenceCalendarService.getCalendar(selectedYearMonth);
        console.log('[Adherence] month=', selectedYearMonth, 'summary=', JSON.stringify(fresh.month_summary), 'days_count=', fresh.days.length);
        if (!cancelled) {
          setCalendarData(fresh);
          offlineCache.set(`adherence_calendar_${selectedYearMonth}`, fresh);
          setIsOnline(true);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setIsOnline(false);
          if (!cached) {
            setLoadError('Could not load adherence data — connect to retry');
          }
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedYearMonth, gamLoading, isLocked]);

  // Fetch milestones
  useEffect(() => {
    if (gamLoading || isLocked) return;
    let cancelled = false;
    const load = async () => {
      setMilestonesLoading(true);
      try {
        const data = await gamificationService.getMilestones();
        if (!cancelled) {
          setMilestones(data.milestones);
          setConsistencyBonus(data.consistency_bonus ?? null);
        }
      } catch {
        if (!cancelled) {
          const fallback: MilestoneInfo[] = [
            { name: 'Dedicated', required_months: 3, xp_reward: 100, current_streak: perfectMonthsStreak, is_achieved: false },
            { name: 'Committed', required_months: 6, xp_reward: 250, current_streak: perfectMonthsStreak, is_achieved: false },
            { name: 'Devoted', required_months: 12, xp_reward: 500, current_streak: perfectMonthsStreak, is_achieved: false },
          ];
          setMilestones(fallback);
          setConsistencyBonus(null);
        }
      } finally {
        if (!cancelled) setMilestonesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [gamLoading, isLocked, perfectMonthsStreak]);

  // Compute stickers from calendar data
  const stickers = useMemo(() => {
    if (!calendarData) return new Map();
    return computeStickers(calendarData.days);
  }, [calendarData]);

  // Day press handler — guard against future days
  const onDayPress = useCallback((dateStr: string) => {
    if (isFutureDate(dateStr)) return;
    setSelectedDate(dateStr);
  }, []);

  // Get doses for selected date
  const selectedDoses: CalendarDoseRecord[] = useMemo(() => {
    if (!selectedDate || !calendarData) return [];
    const dayRecord = calendarData.days.find((d) => d.date === selectedDate);
    return dayRecord?.doses ?? [];
  }, [selectedDate, calendarData]);

  // Month navigation
  const isCurrentMonth = selectedYearMonth === currentYearMonth();
  const canGoForward = !isCurrentMonth;
  const canGoBack = !accountStartMonth || selectedYearMonth > accountStartMonth;

  const goBack = () => {
    if (canGoBack) setSelectedYearMonth(prevYearMonth(selectedYearMonth));
  };
  const goForward = () => {
    if (canGoForward) setSelectedYearMonth(nextYearMonth(selectedYearMonth));
  };

  // --- Conditional renders (after all hooks) ---

  if (gamLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <LockedFeatureScreen
        featureLabel="My Adherence"
        requiredTier={2}
        currentTier={currentTier}
        currentXp={totalXp}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          My Adherence
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.bgElevated }]}>
          <WifiOff size={14} color={colors.warning} />
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            Showing cached data — connect to refresh
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 45: Trial preview banner */}
        {isInTrial && subscriptionEnabled && (
          <View style={[styles.trialPreviewBanner, { backgroundColor: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
            <Text style={[styles.trialPreviewTitle, { color: colors.cyan }]}>
              Preview
            </Text>
            <Text style={[styles.trialPreviewText, { color: colors.textSecondary }]}>
              By month's end, your calendar will show your complete adherence story.{' '}
              {trialDaysLeft !== null ? `${trialDaysLeft} days left in trial.` : ''}
            </Text>
          </View>
        )}

        {/* Month navigation — centered cluster to avoid confusion with back arrow */}
        <View style={styles.monthNav}>
          <View style={styles.monthNavCluster}>
            <TouchableOpacity
              onPress={goBack}
              disabled={!canGoBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft
                size={24}
                color={canGoBack ? colors.textPrimary : colors.textMuted}
              />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {formatMonthLabel(selectedYearMonth)}
            </Text>
            <TouchableOpacity
              onPress={goForward}
              disabled={!canGoForward}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight
                size={24}
                color={canGoForward ? colors.textPrimary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ritual Tree hidden — deferred to V2.
            Original: Tier 4+ only, reads calendarData.month_summary for tree growth states.
            Re-enable when Ritual Tree is brought back from V2. */}

        {/* XP Growth Card — above calendar */}
        {calendarData && (
          <XpGrowthCard
            xpStart={calendarData.month_summary.xp_start}
            xpEnd={calendarData.month_summary.xp_end}
            prevMonthXpDelta={calendarData.month_summary.prev_month_xp_delta ?? null}
            currentTier={currentTier}
            totalXp={totalXp}
          />
        )}

        {/* Milestone Banner — between XpGrowthCard and calendar */}
        {calendarData && (
          <MilestoneBanner
            perfectMonthsStreak={perfectMonthsStreak}
            imperfectDays={calendarData.month_summary.imperfect_days}
            currentMonthHasMissedDays={calendarData.month_summary.missed_days > 0}
            isCurrentMonth={isCurrentMonth}
          />
        )}

        {/* Loading state */}
        {dataLoading && !calendarData && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.cyan} />
          </View>
        )}

        {/* Error state */}
        {loadError && !calendarData && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>
              {loadError}
            </Text>
          </View>
        )}

        {/* Calendar heat map */}
        {(calendarData || !dataLoading) && (
          <CalendarHeatMap
            data={calendarData}
            yearMonth={selectedYearMonth}
            stickers={stickers}
            onDayPress={onDayPress}
          />
        )}

        {/* Calendar legend */}
        <CalendarLegend />

        {/* Weekly Milestones & Monthly Stats hidden — deferred to V2.
            Original: Tier 4+ only, showed WeeklyMilestones + MonthlyStatsCard.
            Re-enable when Tier 4 features are brought back from V2. */}

        {/* Monthly Milestones */}
        <View style={[styles.milestonesSection, { borderTopColor: colors.border }]}>
          <View style={styles.milestonesSectionHeader}>
            <Award color={colors.cyan} size={18} strokeWidth={2} />
            <Text style={[styles.milestonesSectionTitle, { color: colors.textPrimary }]}>Monthly Milestones</Text>
          </View>
          <Text style={[styles.milestonesSectionDesc, { color: colors.textMuted }]}>
            Maintain consecutive perfect months to earn milestone rewards.
          </Text>

          {milestonesLoading ? (
            <ActivityIndicator size="small" color={colors.cyan} style={{ marginTop: 16 }} />
          ) : (
            milestones?.map((milestone) => {
              const milestoneColor = MILESTONE_COLORS[milestone.name] ?? colors.cyan;
              const progress = Math.min(1, milestone.current_streak / milestone.required_months);
              const progressPercent = progress * 100;

              return (
                <View
                  key={milestone.name}
                  style={[
                    styles.milestoneCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                    milestone.is_achieved && { borderColor: 'rgba(255, 215, 0, 0.25)', backgroundColor: 'rgba(255, 215, 0, 0.04)' },
                  ]}
                >
                  <View style={styles.milestoneHeader}>
                    <View style={styles.milestoneNameRow}>
                      {milestone.is_achieved ? (
                        <View style={[styles.milestoneCheckCircle, { backgroundColor: milestoneColor }]}>
                          <Check color="#000" size={12} strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={[styles.milestoneIconCircle, { borderColor: milestoneColor }]}>
                          <Award color={milestoneColor} size={14} strokeWidth={2} />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.milestoneName,
                          { color: colors.textPrimary },
                          milestone.is_achieved && { color: milestoneColor },
                        ]}
                      >
                        {milestone.name}
                      </Text>
                    </View>
                    <Text style={[styles.milestoneReward, { color: colors.cyan }]}>+{milestone.xp_reward} XP</Text>
                  </View>

                  <Text style={[styles.milestoneRequirement, { color: colors.textMuted }]}>
                    {milestone.is_achieved
                      ? 'Achieved!'
                      : `${milestone.current_streak} / ${milestone.required_months} perfect months`}
                  </Text>

                  {!milestone.is_achieved && (
                    <View style={[styles.milestoneProgressTrack, { backgroundColor: colors.bgSubtle }]}>
                      <View
                        style={[
                          styles.milestoneProgressFill,
                          { width: `${progressPercent}%`, backgroundColor: milestoneColor },
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Consistency Bonus card (post-Devoted recurring reward) */}
          {consistencyBonus && (
            <View
              style={[
                styles.milestoneCard,
                { backgroundColor: colors.bgCard, borderColor: '#06B6D4' },
              ]}
            >
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneNameRow}>
                  <View style={[styles.milestoneIconCircle, { borderColor: '#06B6D4' }]}>
                    <Award color="#06B6D4" size={14} strokeWidth={2} />
                  </View>
                  <Text style={[styles.milestoneName, { color: '#06B6D4' }]}>
                    Consistency Bonus
                  </Text>
                </View>
                <Text style={[styles.milestoneReward, { color: '#06B6D4' }]}>+{consistencyBonus.xp_reward} XP</Text>
              </View>

              <Text style={[styles.milestoneRequirement, { color: colors.textMuted }]}>
                {consistencyBonus.months_until_next === 3
                  ? 'New cycle started — keep going!'
                  : `${3 - consistencyBonus.months_until_next} / 3 perfect months`}
                {consistencyBonus.total_awarded > 0
                  ? ` (earned ${consistencyBonus.total_awarded}x = +${consistencyBonus.total_xp_earned} XP)`
                  : ''}
              </Text>

              <View style={[styles.milestoneProgressTrack, { backgroundColor: colors.bgSubtle }]}>
                <View
                  style={[
                    styles.milestoneProgressFill,
                    {
                      width: `${((3 - consistencyBonus.months_until_next) / 3) * 100}%`,
                      backgroundColor: '#06B6D4',
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* No doses scheduled message */}
        {calendarData && calendarData.month_summary.total_scheduled_days === 0 && (
          <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: 12 }}>
            No doses scheduled
          </Text>
        )}

      </ScrollView>

      {/* Day detail modal */}
      <DayDetailModal
        visible={selectedDate !== null}
        date={selectedDate}
        doses={selectedDoses}
        sticker={selectedDate ? (stickers.get(selectedDate) ?? null) : null}
        onClose={() => setSelectedDate(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthNavCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  milestonesSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  milestonesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  milestonesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  milestonesSectionDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  milestoneCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneReward: {
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneRequirement: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 30,
  },
  milestoneProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 30,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  trialPreviewBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  trialPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  trialPreviewText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
