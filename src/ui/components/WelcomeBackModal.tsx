/**
 * WelcomeBackModal — half-sheet modal shown on app open when comeback boost is active.
 *
 * Gold/amber theme with "2x" glow, countdown, "Let's Go" dismiss.
 * Auto-dismisses after 10 seconds. AsyncStorage dedup prevents re-showing
 * within the same boost period.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Zap } from 'lucide-react-native';
import { colors } from '../theme/colors';

const STORAGE_KEY = 'lastBoostModalShown';
const AUTO_DISMISS_MS = 10_000;

interface WelcomeBackModalProps {
  visible: boolean;
  boostHoursRemaining: number;
  onDismiss: () => void;
}

/**
 * Check if modal should be shown (dedup: once per boost activation).
 * Returns true if never shown or shown before current boost.
 */
export async function shouldShowWelcomeBack(
  comebackBoostUntil: string | null,
): Promise<boolean> {
  if (!comebackBoostUntil) return false;
  try {
    const lastShown = await AsyncStorage.getItem(STORAGE_KEY);
    // Only show if we haven't shown for this specific boost period
    return lastShown !== comebackBoostUntil;
  } catch {
    return true;
  }
}

/** Mark modal as shown for this boost period. */
export async function markWelcomeBackShown(
  comebackBoostUntil: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, comebackBoostUntil);
  } catch {
    // non-critical
  }
}

export default function WelcomeBackModal({
  visible,
  boostHoursRemaining,
  onDismiss,
}: WelcomeBackModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* Half-sheet */}
        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
        >
          {/* Gold glow circle with 2x */}
          <View style={styles.glowContainer}>
            <View style={styles.outerGlow}>
              <Zap color="#FFD700" size={28} strokeWidth={2.5} fill="#FFD700" />
              <Text style={styles.boostMultiplier}>2x</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Your comeback boost is active. All XP earned today is doubled!
          </Text>

          <Text style={styles.countdown}>
            {boostHoursRemaining > 0
              ? `${boostHoursRemaining}h remaining`
              : 'Expiring soon'}
          </Text>

          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Let's Go</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
  },
  glowContainer: {
    marginBottom: 20,
  },
  outerGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  boostMultiplier: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  countdown: {
    color: 'rgba(255, 215, 0, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 24,
  },
  button: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
});
