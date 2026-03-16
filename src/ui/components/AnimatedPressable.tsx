/**
 * Scale-down press wrapper using Reanimated.
 * Applies a subtle 0.97 scale animation on press for tactile feedback.
 */

import React from 'react';
import { TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import Animated from 'react-native-reanimated';
import { haptics } from '../../data/utils/haptics';
import { usePressAnimation } from '../theme/animations';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  disabled?: boolean;
  hitSlop?: number | { top?: number; left?: number; bottom?: number; right?: number };
  delayLongPress?: number;
  hapticOnPress?: boolean;
}

export default function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  activeOpacity = 0.9,
  disabled = false,
  hitSlop,
  delayLongPress,
  hapticOnPress = true,
}: AnimatedPressableProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();

  const handlePress = () => {
    if (hapticOnPress) {
      haptics.light();
    }
    onPress?.();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={style}
        activeOpacity={activeOpacity}
        disabled={disabled}
        hitSlop={hitSlop}
        delayLongPress={delayLongPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
