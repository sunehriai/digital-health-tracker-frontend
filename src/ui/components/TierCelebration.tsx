/**
 * TierCelebration -- Full-screen overlay for tier-up celebrations.
 *
 * Displays the new tier badge (from TIER_ASSETS) scaling up with a glow
 * and confetti effect. Shows "You've reached [Tier Name]!" text.
 * Plays for 3 seconds then auto-dismisses.
 * Haptic success pattern on trigger.
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { haptics } from '../../data/utils/haptics';
import { TIER_ASSETS, TIER_NAMES } from '../../domain/constants/tierAssets';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';

interface TierCelebrationProps {
  /** Whether to show the celebration */
  visible: boolean;
  /** The new tier number (1-5) */
  newTier: number;
  /** Called when the celebration finishes (after 3 seconds) */
  onComplete: () => void;
}

// Confetti particle positions (pre-computed for visual scatter)
// color field uses 'cyan' as a sentinel replaced at render time with colors.cyan
const CONFETTI_PARTICLES = [
  { left: '12%', top: '18%', color: '#FFD700', delay: 100, rotate: '15deg' },
  { left: '75%', top: '15%', color: 'cyan', delay: 200, rotate: '-20deg' },
  { left: '25%', top: '72%', color: '#FF4500', delay: 150, rotate: '45deg' },
  { left: '80%', top: '68%', color: '#22C55E', delay: 250, rotate: '-35deg' },
  { left: '50%', top: '10%', color: '#F59E0B', delay: 50, rotate: '30deg' },
  { left: '10%', top: '45%', color: '#A855F7', delay: 300, rotate: '-10deg' },
  { left: '88%', top: '40%', color: '#EC4899', delay: 180, rotate: '60deg' },
  { left: '35%', top: '82%', color: 'cyan', delay: 120, rotate: '-45deg' },
];

function ConfettiParticle({
  left,
  top,
  color,
  delay,
  rotate,
}: {
  left: string;
  top: string;
  color: string;
  delay: number;
  rotate: string;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1500, withTiming(0, { duration: 600 }))
      )
    );
    translateY.value = withDelay(
      delay,
      withTiming(-30, { duration: 2000, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { left: left as any, top: top as any, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

export default function TierCelebration({ visible, newTier, onComplete }: TierCelebrationProps) {
  const { colors } = useTheme();
  const { prefs: { reducedMotion } } = useAppPreferences();
  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const overlayOpacity = useSharedValue(0);

  const tierName = TIER_NAMES[newTier] ?? `Tier ${newTier}`;
  const badgeSource = TIER_ASSETS[newTier];

  const handleDismiss = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (visible) {
      // Haptic success pattern (respects haptic preference)
      haptics.success();

      if (reducedMotion) {
        // Reduced motion: show everything immediately, no animations
        overlayOpacity.value = 1;
        badgeScale.value = 1;
        badgeOpacity.value = 1;
        textOpacity.value = 1;
        textTranslateY.value = 0;

        // Auto-dismiss after 3 seconds with simple fade-out
        const timer = setTimeout(() => {
          overlayOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
              runOnJS(handleDismiss)();
            }
          });
        }, 3000);

        return () => clearTimeout(timer);
      }

      // Overlay fade in
      overlayOpacity.value = withTiming(1, { duration: 300 });

      // Badge scale-up from center (spring for bounce)
      badgeOpacity.value = withTiming(1, { duration: 200 });
      badgeScale.value = withSpring(1, {
        damping: 10,
        stiffness: 100,
        mass: 0.8,
      });

      // Glow pulse
      glowOpacity.value = withDelay(
        200,
        withSequence(
          withTiming(0.8, { duration: 400 }),
          withTiming(0.3, { duration: 600 }),
          withTiming(0.6, { duration: 400 }),
          withTiming(0.2, { duration: 600 })
        )
      );
      glowScale.value = withDelay(
        200,
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1.1, { duration: 600 }),
          withTiming(1.2, { duration: 400 }),
          withTiming(1.0, { duration: 600 })
        )
      );

      // Text entrance
      textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      textTranslateY.value = withDelay(
        400,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(handleDismiss)();
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // Reset all values
      badgeScale.value = 0;
      badgeOpacity.value = 0;
      glowScale.value = 0.5;
      glowOpacity.value = 0;
      textOpacity.value = 0;
      textTranslateY.value = 20;
      overlayOpacity.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { backgroundColor: colors.overlayHeavy }, overlayStyle]}>
        {/* Confetti particles (skip when reducedMotion) */}
        {!reducedMotion && CONFETTI_PARTICLES.map((p, i) => (
          <ConfettiParticle key={i} {...p} color={p.color === 'cyan' ? colors.cyan : p.color} />
        ))}

        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { borderColor: colors.cyan, shadowColor: colors.cyan }, glowStyle]} />

        {/* Badge */}
        <Animated.View style={[styles.badgeContainer, badgeStyle]}>
          <Image source={badgeSource} style={styles.badgeImage} resizeMode="contain" />
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={[styles.congratsText, { color: colors.cyan }]}>Tier Up!</Text>
          <Text style={[styles.tierText, { color: colors.textPrimary }]}>You've reached {tierName}!</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 12,
  },
  badgeContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeImage: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  congratsText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tierText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 209, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
