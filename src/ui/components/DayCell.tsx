import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Zap, Shield, Dumbbell, Star, Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AdherenceLevel } from '../../domain/utils/calendarUtils';
import type { StickerType } from '../../domain/utils/stickerCalculator';
import type { StreakIndicator } from '../../domain/utils/stickerCalculator';

interface DayCellProps {
  dateStr: string | null;
  adherenceLevel: AdherenceLevel;
  adherencePct: number | null;
  sticker: StickerType | null;
  streakIndicator: StreakIndicator | null;
  isToday: boolean;
  isFuture: boolean;
  onPress: () => void;
  size: number;
}

const STICKER_ICONS: Record<StickerType, typeof Zap> = {
  sprint: Zap,
  warrior: Shield,
  resilience: Dumbbell,
  perfect_week: Star,
};

const STICKER_COLORS: Record<StickerType, string> = {
  sprint: '#F59E0B',
  warrior: '#8B5CF6',
  resilience: '#22C55E',
  perfect_week: '#F97316',
};

const DELAYED_COLOR = '#F59E0B';
const MISSED_BORDER = '#F87171'; // light red

export default function DayCell({
  dateStr,
  adherenceLevel,
  adherencePct,
  sticker,
  streakIndicator,
  isToday,
  isFuture,
  onPress,
  size,
}: DayCellProps) {
  const { colors } = useTheme();

  if (!dateStr) {
    return <View style={{ width: size, height: size }} />;
  }

  const isBlank = isFuture || adherenceLevel === 'none';
  const dayNumber = parseInt(dateStr.split('-')[2], 10);

  const StickerIcon = sticker ? STICKER_ICONS[sticker] : null;
  const stickerColor = sticker ? STICKER_COLORS[sticker] : undefined;

  // 4-state background rendering
  const isPerfect = adherenceLevel === 'perfect';
  const isDelayed = adherenceLevel === 'delayed';
  const isPartial = adherenceLevel === 'partial';
  const isMissed = adherenceLevel === 'missed';

  // Determine background color
  // Perfect = solid cyan, Delayed = solid orange, Partial = dimmed cyan, Missed = transparent
  let bgColor = 'transparent';
  if (isPerfect) bgColor = colors.cyan;
  else if (isDelayed) bgColor = DELAYED_COLOR;
  else if (isPartial) bgColor = colors.cyanDim;

  // Determine text color
  let textColor = colors.textMuted;
  if (isPerfect || isDelayed) textColor = colors.bg;
  else if (isPartial) textColor = colors.textPrimary;
  else if (isMissed) textColor = colors.textSecondary;
  else if (!isBlank) textColor = colors.textSecondary;

  // Half-circle icon size for partial days
  const halfCircleSize = Math.round(size * 0.28);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isBlank}
      activeOpacity={0.7}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: 10,
          backgroundColor: bgColor,
        },
        isPartial && {
          borderWidth: 1,
          borderColor: colors.cyan,
        },
        isMissed && {
          borderWidth: 1,
          borderColor: MISSED_BORDER,
        },
        isBlank && !isFuture && adherenceLevel === 'none' && {
          // No border for truly blank days
        },
        isFuture && {
          borderWidth: 1,
          borderColor: colors.textMuted,
          opacity: 0.4,
        },
        isToday && {
          borderWidth: 1.5,
          borderColor: colors.cyan,
        },
      ]}
    >
      {/* Inner highlight strip for perfect days */}
      {isPerfect && (
        <View style={[styles.innerHighlight, { borderRadius: 1 }]} />
      )}

      <Text
        style={[
          styles.dayText,
          {
            color: textColor,
            fontSize: size > 36 ? 11 : 9,
          },
          (isPerfect || isDelayed) && { fontWeight: '700' },
        ]}
      >
        {dayNumber}
      </Text>

      {/* Today clock icon (top-right) */}
      {isToday && (
        <Clock
          size={10}
          color={colors.cyan}
          style={styles.topRight}
        />
      )}

      {/* Adherence indicator for partial days (bottom-right) — black fill proportional to % */}
      {isPartial && !StickerIcon && (
        <View
          style={[
            styles.bottomRight,
            {
              width: halfCircleSize,
              height: halfCircleSize,
              borderRadius: halfCircleSize / 2,
              backgroundColor: colors.border,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Accent fill from left, width driven by adherence % */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: halfCircleSize * Math.max(0.1, (adherencePct ?? 50) / 100),
              height: halfCircleSize,
              backgroundColor: colors.cyan,
            }}
          />
        </View>
      )}

      {/* Sticker (bottom-right) */}
      {StickerIcon && !isBlank && (
        <StickerIcon
          size={16}
          color="#FFFFFF"
          strokeWidth={2.5}
          style={styles.bottomRight}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  innerHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dayText: {
    fontWeight: '500',
    zIndex: 1,
  },
  topRight: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});
