import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Zap, Shield, Dumbbell, Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AdherenceLevel } from '../../domain/utils/calendarUtils';
import type { StickerType } from '../../domain/utils/stickerCalculator';
import type { StreakIndicator } from '../../domain/utils/stickerCalculator';

interface DayCellProps {
  dateStr: string | null;
  adherenceLevel: AdherenceLevel;
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

export default function DayCell({
  dateStr,
  adherenceLevel,
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

  // 3-state background rendering
  const isPerfect = adherenceLevel === 'perfect';
  const isPartial = adherenceLevel === 'partial';
  const isMissed = adherenceLevel === 'missed';

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
          borderRadius: 6,
          backgroundColor: isBlank
            ? 'transparent'
            : isPerfect
              ? colors.chartAccent
              : 'transparent',
        },
        isMissed && {
          borderWidth: 1,
          borderColor: colors.error,
        },
        isToday && {
          borderWidth: 1.5,
          borderColor: colors.cyan,
        },
      ]}
    >
      {/* Partial: bottom-half amber fill */}
      {isPartial && (
        <View
          style={[
            styles.partialFill,
            { backgroundColor: colors.warning, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
          ]}
        />
      )}

      {/* Inner highlight strip for perfect days */}
      {isPerfect && (
        <View style={styles.innerHighlight} />
      )}

      <Text
        style={[
          styles.dayText,
          {
            color: isBlank
              ? colors.textMuted
              : isPerfect
                ? colors.bg
                : colors.textSecondary,
            fontSize: size > 36 ? 11 : 9,
          },
          isPerfect && { fontWeight: '700' },
        ]}
      >
        {dayNumber}
      </Text>

      {/* Streak indicator removed — color alone communicates adherence state */}

      {/* Sticker (bottom-right) */}
      {StickerIcon && !isBlank && (
        <StickerIcon
          size={12}
          color={stickerColor}
          style={styles.sticker}
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
  partialFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  innerHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dayText: {
    fontWeight: '500',
    zIndex: 1,
  },
  sticker: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});
