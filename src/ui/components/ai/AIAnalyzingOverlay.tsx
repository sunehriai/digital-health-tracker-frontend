/**
 * AI Analyzing Overlay
 *
 * Full-screen overlay shown during AI image analysis.
 * Displays animated loading state with progress messaging.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Scan, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface AIAnalyzingOverlayProps {
  visible: boolean;
}

const MESSAGES = [
  'Analyzing medication label...',
  'Reading dosage information...',
  'Extracting schedule details...',
  'Processing...',
];

export function AIAnalyzingOverlay({ visible }: AIAnalyzingOverlayProps) {
  const { colors } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Cycle through messages
  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [visible, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlayHeavy }]}>
        <View style={styles.content}>
          {/* Animated icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[colors.cyanGlow, colors.cyanDim]}
              style={[styles.iconGradient, { borderColor: colors.cyanDim }]}
            >
              <View style={[styles.iconInner, { backgroundColor: colors.cyanDim }]}>
                <Scan size={40} color={colors.cyan} />
              </View>
            </LinearGradient>

            {/* Sparkles decoration */}
            <View style={[styles.sparkle, styles.sparkle1]}>
              <Sparkles size={14} color={colors.cyan} />
            </View>
            <View style={[styles.sparkle, styles.sparkle2]}>
              <Sparkles size={10} color={colors.cyan} />
            </View>
            <View style={[styles.sparkle, styles.sparkle3]}>
              <Sparkles size={12} color={colors.cyan} />
            </View>
          </View>

          {/* Loading indicator */}
          <ActivityIndicator
            size="large"
            color={colors.cyan}
            style={styles.spinner}
          />

          {/* Animated message */}
          <Animated.Text style={[styles.message, { opacity: fadeAnim, color: colors.textPrimary }]}>
            {MESSAGES[messageIndex]}
          </Animated.Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            This usually takes a few seconds
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Inline loading state for use within screens (not modal)
 */
export function AIAnalyzingInline() {
  const { colors } = useTheme();

  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size="small" color={colors.cyan} />
      <Text style={[styles.inlineText, { color: colors.cyan }]}>Analyzing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.6,
  },
  sparkle1: {
    top: -4,
    right: 4,
  },
  sparkle2: {
    bottom: 8,
    left: -8,
  },
  sparkle3: {
    top: 20,
    right: -12,
  },
  spinner: {
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  inlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
