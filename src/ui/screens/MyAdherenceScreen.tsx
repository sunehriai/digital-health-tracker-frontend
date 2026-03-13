import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, ArrowLeft, WifiOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGamification } from '../hooks/useGamification';
import { isFeatureUnlocked } from '../../domain/utils/tierGating';
import LockedFeatureScreen from '../components/LockedFeatureScreen';
import CalendarHeatMap from '../components/CalendarHeatMap';
import DayDetailModal from '../components/DayDetailModal';
import MonumentBanner from '../components/MonumentBanner';
import { adherenceCalendarService } from '../../data/services/adherenceCalendarService';
import { offlineCache } from '../../data/utils/offlineCache';
import { computeStickers } from '../../domain/utils/stickerCalculator';
import {
  currentYearMonth,
  formatMonthLabel,
  isFutureDate,
  nextYearMonth,
  prevYearMonth,
} from '../../domain/utils/calendarUtils';
import type { MonthAdherenceResponse, CalendarDoseRecord } from '../../domain/types';
import type { RootStackParamList } from '../navigation/types';

export default function MyAdherenceScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentTier, totalXp, loading: gamLoading } = useGamification();

  // Month navigation state
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth());
  const [calendarData, setCalendarData] = useState<MonthAdherenceResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Day detail modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const isLocked = !gamLoading && !isFeatureUnlocked('monthly_calendar', currentTier);

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
        setDataLoading(true);
      }

      // 2. Always fetch fresh data
      try {
        const fresh = await adherenceCalendarService.getCalendar(selectedYearMonth);
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

  const goBack = () => setSelectedYearMonth(prevYearMonth(selectedYearMonth));
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
        requiredTier={3}
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
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color={colors.textPrimary} />
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

        {/* Monument banner: progress + XP journey */}
        <MonumentBanner summary={calendarData?.month_summary ?? null} />
      </ScrollView>

      {/* Day detail modal */}
      <DayDetailModal
        visible={selectedDate !== null}
        date={selectedDate}
        doses={selectedDoses}
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
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
});
