import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ScreenshotToastProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Non-intrusive toast shown at bottom of screen when a screenshot is detected.
 * Auto-dismisses after 3 seconds with opacity fade.
 */
export default function ScreenshotToast({ visible, onDismiss }: ScreenshotToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Screenshot captured. Use Share to securely export health data.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: '#1E2633',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 9990,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
