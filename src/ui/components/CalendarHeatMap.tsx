import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import DayCell from './DayCell';
import { buildMonthGrid, computeAdherenceLevel, todayDateStr, isFutureDate } from '../../domain/utils/calendarUtils';
import { computeStreakFlames } from '../../domain/utils/stickerCalculator';
import type { MonthAdherenceResponse } from '../../domain/types';
import type { StickerType } from '../../domain/utils/stickerCalculator';

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GAP = 4;

interface CalendarHeatMapProps {
  data: MonthAdherenceResponse | null;
  yearMonth: string;
  stickers: Map<string, StickerType>;
  onDayPress: (date: string) => void;
}

export default function CalendarHeatMap({
  data,
  yearMonth,
  stickers,
  onDayPress,
}: CalendarHeatMapProps) {
  const { colors, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const cellSize = containerWidth > 0 ? (containerWidth - 6 * GAP) / 7 : 0;
  const grid = buildMonthGrid(yearMonth);
  const today = todayDateStr();

  // Build a lookup for day records
  const dayMap = new Map<string, typeof data extends null ? never : NonNullable<typeof data>['days'][number]>();
  if (data) {
    for (const d of data.days) {
      dayMap.set(d.date, d);
    }
  }

  // Compute streak flame indicators
  const streakFlames = useMemo(
    () => computeStreakFlames(data?.days ?? [], data?.month_summary?.best_streak_start ?? null),
    [data],
  );

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Day-of-week header */}
      <View style={[styles.headerRow, { gap: GAP }]}>
        {DAY_HEADERS.map((label, i) => (
          <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={[styles.headerText, { color: colors.textMuted }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {cellSize > 0 &&
        grid.map((week, weekIdx) => (
          <View key={weekIdx} style={[styles.weekRow, { gap: GAP }]}>
            {week.map((dateStr, dayIdx) => {
              const dayRecord = dateStr ? dayMap.get(dateStr) : undefined;
              const adherenceLevel =
                data && dateStr && dayRecord
                  ? computeAdherenceLevel(dayRecord.adherence_pct, dayRecord.is_on_time_perfect, dayRecord.is_all_taken)
                  : 'none';
              const future = dateStr ? isFutureDate(dateStr) : false;

              return (
                <DayCell
                  key={dayIdx}
                  dateStr={dateStr}
                  adherenceLevel={future ? 'none' : adherenceLevel}
                  sticker={dateStr ? (stickers.get(dateStr) ?? null) : null}
                  streakIndicator={dateStr ? (streakFlames.get(dateStr) ?? null) : null}
                  isToday={dateStr === today}
                  isFuture={future}
                  onPress={() => dateStr && onDayPress(dateStr)}
                  size={cellSize}
                />
              );
            })}
          </View>
        ))}

      {/* Loading skeleton */}
      {!data && containerWidth > 0 && (
        <View style={styles.skeletonOverlay}>
          {Array.from({ length: 5 }).map((_, row) => (
            <View key={row} style={[styles.weekRow, { gap: GAP }]}>
              {Array.from({ length: 7 }).map((_, col) => (
                <View
                  key={col}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 26, // below header
    left: 0,
    right: 0,
  },
});
