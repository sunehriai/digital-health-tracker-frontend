/**
 * XpAnimation -- "+12 XP" pop-up that floats up and fades out.
 *
 * D17 Delayed Counter Trick:
 * - Fires immediately with client-estimated XP (from xpCalculator.ts)
 * - Header updates with server-authoritative value while animation plays
 * - User's eyes follow animation upward; by the time they look at header,
 *   the correct total is already displayed
 *
 * D17 Option A (Offline):
 * - When offline, this component should NOT be rendered.
 *   The parent decides whether to show XpAnimation based on connectivity.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

interface XpAnimationProps {
  /** Estimated XP to display (from xpCalculator) */
  xpAmount: number;
  /** Called when the animation finishes (after fade-out) */
  onComplete?: () => void;
  /** Whether to trigger the animation (set to true to fire) */
  trigger: boolean;
  /** N-22/BP-019: When true, shows gold text with "2x Boost!" label. Defaults to false. */
  isBoosted?: boolean;
}

export default function XpAnimation({ xpAmount, onComplete, trigger, isBoosted = false }: XpAnimationProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger && xpAmount > 0) {
      // Reset values
      translateY.value = 0;
      opacity.value = 0;

      // Haptic Light Impact on trigger
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
          // Silently fail on unsupported devices
        });
      }

      // Fade in quickly
      opacity.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) });

      // Float up 40px over 0.5s
      translateY.value = withTiming(-40, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });

      // Fade out after floating up
      opacity.value = withDelay(
        300,
        withTiming(0, {
          duration: 200,
          easing: Easing.in(Easing.quad),
        }, (finished) => {
          if (finished && onComplete) {
            runOnJS(onComplete)();
          }
        })
      );
    }
  }, [trigger, xpAmount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!trigger || xpAmount <= 0) {
    return null;
  }

  const label = isBoosted ? `+${xpAmount} XP (2x Boost!)` : `+${xpAmount} XP`;

  return (
    <Animated.Text style={[isBoosted ? styles.xpTextBoosted : styles.xpText, animatedStyle]}>
      {label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  xpText: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 209, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    position: 'absolute',
    alignSelf: 'center',
    top: -8,
    zIndex: 10,
  },
  xpTextBoosted: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    position: 'absolute',
    alignSelf: 'center',
    top: -8,
    zIndex: 10,
  },
});
