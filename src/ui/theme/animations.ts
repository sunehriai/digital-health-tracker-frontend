/**
 * Shared animation constants and hooks for the UI cosmetic upgrade.
 * All hooks respect the user's `reducedMotion` preference.
 */

import { useRef, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppPreferences } from '../hooks/useAppPreferences';

// Standard Material-like easing curve
export const EASING_STANDARD = Easing.bezier(0.4, 0.0, 0.2, 1);

/**
 * Returns animated style + press handlers that scale to 0.97 on press.
 * No-ops when reducedMotion is enabled.
 */
export function usePressAnimation(scaleTo = 0.97, durationMs = 120) {
  const { prefs } = useAppPreferences();
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (prefs.reducedMotion) return;
    scale.value = withTiming(scaleTo, { duration: durationMs, easing: EASING_STANDARD });
  }, [prefs.reducedMotion, scaleTo, durationMs]);

  const onPressOut = useCallback(() => {
    if (prefs.reducedMotion) return;
    scale.value = withTiming(1, { duration: durationMs, easing: EASING_STANDARD });
  }, [prefs.reducedMotion, durationMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
