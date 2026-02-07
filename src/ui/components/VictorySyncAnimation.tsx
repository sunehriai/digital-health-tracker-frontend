/**
 * VictorySyncAnimation - Clean animated transition to Victory state.
 *
 * Simple, refreshing animation:
 * 1. Smooth fade-in with subtle scale
 * 2. Gentle glow pulse on vitality badge
 * 3. Staggered content entrance
 * 4. Success haptic feedback
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { formatMedName } from '../../domain/utils';
import type { DoseTimeSlot } from '../../domain/types';
import { TouchableOpacity } from 'react-native';

interface VictorySyncAnimationProps {
  isTriggered: boolean;
  points: number;
  insightText: string;
  tomorrowSlot: DoseTimeSlot | null;
  completedCount: number;
  totalCount: number;
  onAnimationComplete?: () => void;
}

export default function VictorySyncAnimation({
  isTriggered,
  points,
  insightText,
  tomorrowSlot,
  completedCount,
  totalCount,
  onAnimationComplete,
}: VictorySyncAnimationProps) {
  const [showTomorrowDoses, setShowTomorrowDoses] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Animation values
  const containerScale = useSharedValue(0.95);
  const containerOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.5);
  const pointsScale = useSharedValue(0.8);

  const triggerHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (isTriggered && !hasTriggered) {
      setHasTriggered(true);

      // Trigger haptic feedback
      triggerHaptic();

      // Container fade in with scale
      containerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      containerScale.value = withSpring(1, { damping: 15, stiffness: 100 });

      // Glow circle entrance
      glowOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      glowScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 80 }));

      // Badge pop
      badgeScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 150 }));

      // Points scale with gentle bounce
      pointsScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.1, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 12, stiffness: 100 })
        )
      );

      // Notify completion
      setTimeout(() => {
        onAnimationComplete?.();
      }, 800);
    }
  }, [isTriggered, hasTriggered]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const pointsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pointsScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles color={colors.cyan} size={18} strokeWidth={2.5} />
        <Text style={styles.headerText}>VITALITY SYNC COMPLETE</Text>
      </View>

      {/* Circular Glow Background with Badge and Points */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <View style={styles.outerGlow}>
          {/* Circular Badge with Zap Icon */}
          <Animated.View style={[styles.circularBadge, badgeStyle]}>
            <Zap color={colors.cyan} size={28} strokeWidth={2.5} fill={colors.cyan} />
          </Animated.View>

          {/* Points Display */}
          <Animated.Text style={[styles.pointsValue, pointsStyle]}>{points}</Animated.Text>
          <Text style={styles.pointsLabel}>VITALITY</Text>
        </View>
      </Animated.View>

      {/* Doses Recorded */}
      <Animated.Text
        entering={FadeInDown.delay(400).duration(300)}
        style={styles.dosesRecorded}
      >
        {completedCount}/{totalCount} doses recorded
      </Animated.Text>

      {/* Insight Text */}
      <Animated.Text
        entering={FadeInDown.delay(500).duration(300)}
        style={styles.insightText}
      >
        {insightText}
      </Animated.Text>

      {/* Next Dose Section */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(300)}
        style={styles.nextDoseSection}
      >
        <TouchableOpacity
          style={styles.nextDoseToggle}
          onPress={() => setShowTomorrowDoses(!showTomorrowDoses)}
          activeOpacity={0.7}
        >
          <Clock color={colors.textMuted} size={14} strokeWidth={2} />
          <Text style={styles.nextDoseLabel}>Next Dose</Text>
          {showTomorrowDoses ? (
            <ChevronUp color={colors.textMuted} size={14} />
          ) : (
            <ChevronDown color={colors.textMuted} size={14} />
          )}
        </TouchableOpacity>

        {showTomorrowDoses && tomorrowSlot && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.tomorrowDetails}
          >
            <Text style={styles.tomorrowTime}>
              {tomorrowSlot.timeDisplay} Tomorrow
            </Text>
            {tomorrowSlot.medications.map(({ medication, doseInfo }) => (
              <View key={medication.id} style={styles.tomorrowMed}>
                <Text style={styles.tomorrowMedName}>{formatMedName(medication.name, 'card')}</Text>
                <Text style={styles.tomorrowMedDose}>{doseInfo}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {showTomorrowDoses && !tomorrowSlot && (
          <Text style={styles.noUpcoming}>No upcoming doses scheduled</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.4)',
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  headerText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  glowContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  outerGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 60, 80, 0.5)',
    borderWidth: 3,
    borderColor: 'rgba(0, 190, 220, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  circularBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(0, 200, 230, 0.9)',
    backgroundColor: 'rgba(0, 80, 100, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointsValue: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pointsLabel: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  dosesRecorded: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  nextDoseSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextDoseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextDoseLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  tomorrowDetails: {
    marginTop: 12,
    gap: 8,
  },
  tomorrowTime: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tomorrowMed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  tomorrowMedName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  tomorrowMedDose: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  noUpcoming: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
