import React, { useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Pill, Check, Clock, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import type { RitualChip, RitualStatus } from '../../domain/types';
import { getRitualStats, findNextDoseIndex, formatMedName } from '../../domain/utils';

interface RitualsCarouselProps {
  /** Pre-computed rituals from HomeScreen - single source of truth */
  rituals: RitualChip[];
  /** Called when user taps to take a dose. chipId is for tracking, medicationId is for API. */
  onTakeDose: (chipId: string, medicationId: string) => Promise<boolean>;
  /** Called when user long-presses to revert a dose */
  onRevertDose?: (chipId: string) => Promise<{ success: boolean; error?: string }>;
  /** Check if a chip can be reverted (within 30-minute window) */
  canRevertChip?: (chipId: string) => boolean;
  disabled?: boolean;
}

export interface RitualsCarouselRef {
  scrollToRitual: (id: string) => void;
}

function getStatusColors(status: RitualStatus) {
  switch (status) {
    case 'completed':
      return {
        border: 'rgba(0,209,255,0.4)',
        bg: 'rgba(0,209,255,0.08)',
        icon: colors.cyan,
        text: colors.cyan,
      };
    case 'next':
      return {
        border: 'rgba(0,209,255,0.8)',
        bg: 'rgba(0,209,255,0.15)',
        icon: colors.cyan,
        text: '#FFFFFF',
      };
    case 'missed':
      return {
        border: 'rgba(255,99,99,0.4)',
        bg: 'rgba(255,99,99,0.08)',
        icon: '#FF6363',
        text: '#FF6363',
      };
    default: // pending
      return {
        border: 'rgba(142,145,150,0.2)',
        bg: 'rgba(18,23,33,0.5)',
        icon: '#8E9196',
        text: '#8E9196',
      };
  }
}

function StatusIndicator({ status }: { status: RitualStatus }) {
  switch (status) {
    case 'completed':
      return (
        <View style={styles.completedDot}>
          <Check color="#000" size={10} strokeWidth={3} />
        </View>
      );
    case 'next':
      return <View style={styles.activeDot} />;
    case 'missed':
      return (
        <View style={styles.missedDot}>
          <AlertCircle color="#FF6363" size={10} strokeWidth={2} />
        </View>
      );
    default: // pending
      return (
        <View style={styles.upcomingDot}>
          <Clock color="#8E9196" size={8} strokeWidth={2} />
        </View>
      );
  }
}

interface RitualTileProps {
  item: RitualChip;
  index: number;
  onTap: () => void;
  onRevert?: () => void;
  canRevert: boolean;
  disabled: boolean;
  isLoading: boolean;
}

function RitualTile({ item, index, onTap, onRevert, canRevert, disabled, isLoading }: RitualTileProps) {
  const sc = getStatusColors(item.status);
  const canTapToTake = !disabled && (item.status === 'next' || item.status === 'pending' || item.status === 'missed');
  const canTapToRevert = !disabled && item.status === 'completed' && canRevert && onRevert;

  const content = (
    <View style={[styles.tile, { backgroundColor: sc.bg, borderColor: sc.border }]}>
      {/* Top row: icon + status */}
      <View style={styles.tileTopRow}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                item.status === 'next'
                  ? 'rgba(0,209,255,0.2)'
                  : 'rgba(142,145,150,0.1)',
            },
          ]}
        >
          <Pill color={sc.icon} size={16} strokeWidth={2} />
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.cyan} />
        ) : (
          <StatusIndicator status={item.status} />
        )}
      </View>

      {/* Info */}
      <View style={styles.tileInfo}>
        <Text style={[styles.tileName, { color: sc.text }]} numberOfLines={1}>
          {formatMedName(item.name, 'tile')}
        </Text>
        <Text style={styles.tileTime}>{item.timeDisplay}</Text>
        <View style={styles.doseRow}>
          <View
            style={[
              styles.doseDot,
              {
                backgroundColor:
                  item.status === 'next' || item.status === 'completed'
                    ? colors.cyan
                    : '#8E9196',
              },
            ]}
          />
          <Text style={styles.doseInfo}>{item.doseInfo}</Text>
        </View>
        {item.mealInfo && <Text style={styles.mealInfo}>{item.mealInfo}</Text>}
      </View>
    </View>
  );

  if (canTapToTake) {
    return (
      <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
        <TouchableOpacity onPress={onTap} activeOpacity={0.7} disabled={disabled}>
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Completed tiles that can be reverted - tap to undo
  if (canTapToRevert) {
    return (
      <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
        <TouchableOpacity
          onPress={onRevert}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityHint="Tap to undo this dose"
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
      {content}
    </Animated.View>
  );
}

const RitualsCarousel = forwardRef<RitualsCarouselRef, RitualsCarouselProps>(
  function RitualsCarousel(
    { rituals, onTakeDose, onRevertDose, canRevertChip, disabled = false },
    ref
  ) {
  const flatListRef = useRef<FlatList<RitualChip>>(null);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [revertingId, setRevertingId] = React.useState<string | null>(null);

  // Rituals are now passed from parent (single source of truth)

  // Expose scrollToRitual method via ref
  useImperativeHandle(ref, () => ({
    scrollToRitual: (id: string) => {
      const index = rituals.findIndex((r) => r.id === id);
      if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3,
        });
      }
    },
  }), [rituals]);

  // Get stats for header
  const stats = useMemo(() => getRitualStats(rituals), [rituals]);

  // Find next dose index for auto-scroll
  const nextDoseIndex = useMemo(() => findNextDoseIndex(rituals), [rituals]);

  // Auto-scroll to next dose on mount and when rituals change
  useEffect(() => {
    if (rituals.length > 0 && nextDoseIndex > 0 && flatListRef.current) {
      // Small delay to ensure layout is complete
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: nextDoseIndex,
          animated: true,
          viewPosition: 0.3, // Position slightly left of center
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nextDoseIndex, rituals.length]);

  const handleTileTap = useCallback(
    async (chipId: string, medicationId: string) => {
      if (disabled || loadingId || revertingId) return;

      setLoadingId(chipId);
      try {
        await onTakeDose(chipId, medicationId);
      } finally {
        setLoadingId(null);
      }
    },
    [disabled, loadingId, revertingId, onTakeDose]
  );

  // Handler for tap to revert a dose
  const handleTileRevert = useCallback(
    async (chipId: string) => {
      if (disabled || loadingId || revertingId || !onRevertDose) return;

      setRevertingId(chipId);
      try {
        const result = await onRevertDose(chipId);
        if (!result.success && result.error) {
          // Could show a toast/alert here - for now just log
          console.log('[RitualsCarousel] Revert failed:', result.error);
        }
      } finally {
        setRevertingId(null);
      }
    },
    [disabled, loadingId, revertingId, onRevertDose]
  );

  // Handle scroll failure gracefully
  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      // Wait and retry
      setTimeout(() => {
        if (flatListRef.current && rituals.length > info.index) {
          flatListRef.current.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.3,
          });
        }
      }, 200);
    },
    [rituals.length]
  );

  if (rituals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Today's Rituals</Text>
          <Text style={styles.counter}>0/0</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No medications scheduled for today</Text>
        </View>
      </View>
    );
  }

  // All rituals completed - show "All caught up!" state
  const isAllComplete = stats.completed === stats.total && stats.total > 0;

  if (isAllComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Today's Rituals</Text>
          <Text style={styles.counterComplete}>
            {stats.completed}/{stats.total}
          </Text>
        </View>
        <View style={styles.completeState}>
          <Check color={colors.cyan} size={20} strokeWidth={2.5} />
          <Text style={styles.completeText}>All caught up!</Text>
          <Text style={styles.completeSubtext}>You've completed all doses for today</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Today's Rituals</Text>
        <Text style={styles.counter}>
          {stats.completed}/{stats.total}
        </Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={rituals}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <RitualTile
            item={item}
            index={index}
            onTap={() => handleTileTap(item.id, item.medicationId)}
            onRevert={onRevertDose ? () => handleTileRevert(item.id) : undefined}
            canRevert={canRevertChip ? canRevertChip(item.id) : false}
            disabled={disabled || revertingId !== null}
            isLoading={loadingId === item.id || revertingId === item.id}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        getItemLayout={(_, index) => ({
          length: 110, // tile width (100) + separator (10)
          offset: 110 * index,
          index,
        })}
      />
    </View>
  );
});

export default RitualsCarousel;

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  heading: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  counter: { color: '#8E9196', fontSize: 10, fontWeight: '500' },
  listContent: { paddingRight: 16 },
  tile: {
    width: 100,
    height: 110,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  tileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  activeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  missedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,99,99,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,99,99,0.3)',
  },
  upcomingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(142,145,150,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142,145,150,0.3)',
  },
  tileInfo: { flex: 1, justifyContent: 'flex-end' },
  tileName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  tileTime: { color: '#8E9196', fontSize: 9, fontWeight: '500', marginBottom: 4 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doseDot: { width: 4, height: 4, borderRadius: 2 },
  doseInfo: { color: '#8E9196', fontSize: 8, fontWeight: '500' },
  mealInfo: { color: '#8E9196', fontSize: 7, fontWeight: '400', marginTop: 2 },
  emptyState: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(142,145,150,0.2)',
    backgroundColor: 'rgba(18,23,33,0.5)',
  },
  emptyText: {
    color: '#8E9196',
    fontSize: 12,
    fontWeight: '500',
  },
  counterComplete: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '600',
  },
  completeState: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    backgroundColor: 'rgba(0, 209, 255, 0.06)',
    gap: 4,
  },
  completeText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  completeSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
