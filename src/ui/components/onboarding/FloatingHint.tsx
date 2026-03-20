import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { useAppPreferences } from '../../hooks/useAppPreferences';

interface FloatingHintProps {
  text: string;
  position?: 'top' | 'bottom' | 'center';
  arrowDirection?: 'up' | 'down' | 'none';
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export default function FloatingHint({
  text,
  position = 'bottom',
  arrowDirection = 'none',
  onDismiss,
}: FloatingHintProps) {
  const { prefs: { reducedMotion } } = useAppPreferences();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 4)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (reducedMotion) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [reducedMotion]);

  // Auto-dismiss timer
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (reducedMotion) {
      onDismiss();
      return;
    }

    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onDismiss();
    });
  };

  const positionStyle = position === 'top'
    ? { top: 20 }
    : position === 'center'
      ? { top: '40%' as any }
      : { bottom: 100 };

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <Animated.View
        style={[
          styles.container,
          positionStyle,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
        pointerEvents="box-only"
        accessibilityRole="alert"
        accessibilityLabel={text}
      >
        {/* Arrow */}
        {arrowDirection === 'up' && <View style={[styles.arrow, styles.arrowUp]} />}

        <Text style={styles.text}>{text}</Text>

        {arrowDirection === 'down' && <View style={[styles.arrow, styles.arrowDown]} />}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    left: 30,
    right: 30,
    maxWidth: 300,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 90,
  },
  text: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    top: -6,
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(45, 212, 191, 0.3)',
  },
  arrowDown: {
    bottom: -6,
    borderTopWidth: 6,
    borderTopColor: 'rgba(45, 212, 191, 0.3)',
  },
});
