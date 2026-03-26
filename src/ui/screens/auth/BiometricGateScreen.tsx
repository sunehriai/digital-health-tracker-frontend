import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore – @expo/vector-icons types may not resolve in strict mode
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { biometrics } from '../../../data/utils/biometrics';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';

interface BiometricGateScreenProps {
  onSuccess: () => void;
  onFallback: () => void;
  onSkip: () => void;
}

export default function BiometricGateScreen({ onSuccess, onFallback, onSkip }: BiometricGateScreenProps) {
  const { colors } = useTheme();
  const [strikes, setStrikes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const attemptBiometric = useCallback(async () => {
    // Check hardware availability first
    const available = await biometrics.isAvailable();
    if (!available) {
      onSkip();
      return;
    }

    setShowRetry(false);
    const result = await biometrics.authenticate('Unlock VitaQuest');

    if (result.success) {
      // Biometric passed — refresh Firebase token with 10s timeout (Fix 4)
      setRefreshing(true);
      try {
        await Promise.race([
          auth().currentUser!.getIdToken(true),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);
        onSuccess();
      } catch {
        onFallback();
      } finally {
        setRefreshing(false);
      }
    } else {
      // Biometric failed — increment strikes
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      if (newStrikes >= 3) {
        onFallback();
      } else {
        setShowRetry(true);
      }
    }
  }, [strikes, onSuccess, onFallback, onSkip]);

  // Auto-trigger on mount with 500ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      attemptBiometric();
    }, 500);
    return () => clearTimeout(timer);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.cyan} />
        </View>

        <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
          Unlock VitaQuest
        </Text>

        <Text style={[typography.bodySmall, styles.subtitle, { color: colors.textMuted }]}>
          Use biometric to continue
        </Text>

        {refreshing && (
          <ActivityIndicator
            size="large"
            color={colors.cyan}
            style={styles.spinner}
          />
        )}

        {showRetry && !refreshing && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: colors.cyan }]}
            onPress={attemptBiometric}
            activeOpacity={0.7}
          >
            <Text style={[typography.button, { color: colors.cyan }]}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 24,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
