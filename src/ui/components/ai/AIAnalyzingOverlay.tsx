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
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Animated icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['rgba(0, 209, 255, 0.2)', 'rgba(0, 209, 255, 0.05)']}
              style={styles.iconGradient}
            >
              <View style={styles.iconInner}>
                <Scan size={40} color="#00D1FF" />
              </View>
            </LinearGradient>

            {/* Sparkles decoration */}
            <View style={[styles.sparkle, styles.sparkle1]}>
              <Sparkles size={14} color="#00D1FF" />
            </View>
            <View style={[styles.sparkle, styles.sparkle2]}>
              <Sparkles size={10} color="#00D1FF" />
            </View>
            <View style={[styles.sparkle, styles.sparkle3]}>
              <Sparkles size={12} color="#00D1FF" />
            </View>
          </View>

          {/* Loading indicator */}
          <ActivityIndicator
            size="large"
            color="#00D1FF"
            style={styles.spinner}
          />

          {/* Animated message */}
          <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
            {MESSAGES[messageIndex]}
          </Animated.Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
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
  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size="small" color="#00D1FF" />
      <Text style={styles.inlineText}>Analyzing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: '#00D1FF',
    fontWeight: '500',
  },
});
