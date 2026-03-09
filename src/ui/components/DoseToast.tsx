import React, { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DoseToastProps {
  visible: boolean;
  title: string;
  body: string;
  onDismiss: () => void;
}

/**
 * Prominent toast shown near the top-center of the screen after a dose is logged.
 * Slides down from top, holds for 3.5s, then fades out.
 */
export default function DoseToast({ visible, title, body, onDismiss }: DoseToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(-40);
      scale.setValue(0.9);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={styles.glowBorder}>
        <View style={styles.inner}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    left: 30,
    right: 30,
    zIndex: 9999,
    elevation: 20,
    alignItems: 'center',
  },
  glowBorder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.4)',
    backgroundColor: '#2A3A4E',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    width: '100%',
  },
  inner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
