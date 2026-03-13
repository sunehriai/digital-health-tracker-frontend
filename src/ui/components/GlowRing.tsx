/**
 * GlowRing — Pulsating SVG ring that responds to streak intensity.
 *
 * - SVG <Circle> stroke only — no shadowColor, no elevation, no platform branching
 * - Streak scaling: 0 = hidden, 1–14 linear, 15+ max
 * - After 8 PM: amplitude drops 40% (evaluated on AppState foreground)
 * - reducedMotion: static ring, no animation
 * - Color injected via prop (decoupled from ThemeContext, D4)
 */
import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useAppPreferences } from '../hooks/useAppPreferences';

// D9: AnimatedCircle created at module level, not inside render
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------------------
// Pure utility functions (D6: exported for testing)
// ---------------------------------------------------------------------------

/** Maps streak days to max pulse opacity. 0 → 0, 1–14 → linear, 15+ → 0.55. */
export function computeMaxOpacity(streakDays: number): number {
  if (streakDays <= 0) return 0;
  if (streakDays >= 15) return 0.55;
  return 0.08 + (streakDays - 1) * (0.47 / 14);
}

/** Returns 0.6 after 8 PM, 1.0 otherwise. Hard cutoff (D3). */
export function computeEveningMultiplier(): number {
  return new Date().getHours() >= 20 ? 0.6 : 1.0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GlowRingProps {
  streakDays: number;
  color: string;
  size: number;
  enabled?: boolean;
  strokeWidth?: number;
}

export default function GlowRing({
  streakDays,
  color,
  size,
  enabled = true,
  strokeWidth = 2,
}: GlowRingProps) {
  const { prefs } = useAppPreferences();
  const reducedMotion = prefs.reducedMotion;
  const pulseOpacity = useSharedValue(0);

  // Refs for AppState handler (avoid stale closures, R-03)
  const streakRef = useRef(streakDays);
  const reducedMotionRef = useRef(reducedMotion);
  streakRef.current = streakDays;
  reducedMotionRef.current = reducedMotion;

  const startAnimation = React.useCallback(() => {
    const max = computeMaxOpacity(streakRef.current) * computeEveningMultiplier();
    if (max <= 0) return;

    cancelAnimation(pulseOpacity);

    if (reducedMotionRef.current) {
      pulseOpacity.value = withTiming(max * 0.5, { duration: 300 });
    } else {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(max, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(max * 0.15, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [pulseOpacity]);

  // Start/restart animation when streak or reducedMotion changes
  useEffect(() => {
    if (streakDays <= 0 || !enabled) return;
    startAnimation();
  }, [streakDays, reducedMotion, enabled, startAnimation]);

  // AppState subscription for evening-dim re-evaluation (no timer)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && streakRef.current > 0) {
        startAnimation();
      }
    });
    return () => sub.remove();
  }, [startAnimation]);

  // D10: zero-streak or disabled — no SVG overhead
  if (streakDays <= 0 || !enabled) return null;

  const radius = (size - strokeWidth) / 2;

  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: pulseOpacity.value,
  }));

  return (
    <Svg
      width={size}
      height={size}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
