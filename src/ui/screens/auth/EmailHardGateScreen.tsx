import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore – @expo/vector-icons types may not resolve in strict mode
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { authService } from '../../../data/services/authService';
import Button from '../../primitives/Button';

interface EmailHardGateScreenProps {
  onVerified: () => void;
  onSignOut: () => void;
}

const COOLDOWN_SECONDS = 60;

export default function EmailHardGateScreen({ onVerified, onSignOut }: EmailHardGateScreenProps) {
  const { colors } = useTheme();

  const [sendCooldown, setSendCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Countdown timer for send cooldown
  useEffect(() => {
    if (!sendCooldown) return;
    setCooldownRemaining(COOLDOWN_SECONDS);

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSendCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sendCooldown]);

  const handleSendVerification = useCallback(async () => {
    if (sendCooldown) return;
    try {
      await authService.sendVerificationEmail();
      setSendCooldown(true);
    } catch {
      // Silently fail — cooldown still activates to prevent spam
      setSendCooldown(true);
    }
  }, [sendCooldown]);

  const handleCheckVerification = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const verified = await authService.checkEmailVerified();
      if (verified) {
        onVerified();
      } else {
        setCheckError('Email not yet verified. Please check your inbox.');
      }
    } catch {
      setCheckError('Unable to check. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [onVerified]);

  const handleOpenEmail = useCallback(() => {
    Linking.openURL('mailto:');
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={48} color={colors.warning} />
        </View>

        <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
          Email Verification Required
        </Text>

        <Text style={[typography.bodySmall, styles.subtitle, { color: colors.textSecondary }]}>
          Your email is not yet verified. To protect your account, access has been paused.
        </Text>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          Your verification link may have expired. Tap below to send a new one.
        </Text>

        <View style={styles.buttonStack}>
          <Button
            title={sendCooldown ? `Link sent! Check your inbox. (${cooldownRemaining}s)` : 'Send New Verification Link'}
            onPress={handleSendVerification}
            variant="primary"
            disabled={sendCooldown}
          />

          <View style={styles.buttonGap} />

          <Button
            title="Check Verification"
            onPress={handleCheckVerification}
            variant="secondary"
            disabled={checking}
            loading={checking}
          />

          {checkError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{checkError}</Text>
          )}

          <View style={styles.buttonGap} />

          <Button
            title="Open Email App"
            onPress={handleOpenEmail}
            variant="ghost"
          />

          <View style={styles.buttonGap} />

          <Button
            title="Sign Out"
            onPress={onSignOut}
            variant="ghost"
          />
        </View>
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
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonStack: {
    width: '100%',
  },
  buttonGap: {
    height: 12,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
