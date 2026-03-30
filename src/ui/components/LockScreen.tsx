// Force-dark: This screen always uses dark theme regardless of user preference
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSecurity } from '../hooks/useSecurity';
import { useAuth } from '../hooks/useAuth';
import { biometrics } from '../../data/utils/biometrics';
import { haptics } from '../../data/utils/haptics';
import { darkColors } from '../theme/ThemeContext';

export default function LockScreen() {
  const security = useSecurity();
  const { signOut } = useAuth();
  const isAuthenticatingRef = useRef(false);
  const hasAutoPromptedRef = useRef(false);

  const getButtonLabel = () => {
    if (security.biometricMethodName) {
      return `Unlock with ${security.biometricMethodName}`;
    }
    return 'Unlock with Passcode';
  };

  const handleAuthenticate = async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;

    try {
      const result = await biometrics.authenticate('Unlock Vitalic');
      if (result.success) {
        if (Platform.OS !== 'web') haptics.success();
        security.unlockApp();
        security.recordAuthentication();
      } else {
        if (Platform.OS !== 'web') haptics.error();
      }
    } catch {
      if (Platform.OS !== 'web') haptics.error();
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  // Auto-prompt biometric on mount (once)
  useEffect(() => {
    if (!hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      // Small delay to let the lock screen render first
      const timer = setTimeout(() => {
        handleAuthenticate();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSignOut = async () => {
    security.unlockApp();
    await signOut();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image
          source={require('../../../assets/splash-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Vitalic</Text>
        <Text style={styles.subtitle}>Your health data is protected</Text>

        <TouchableOpacity
          style={styles.unlockButton}
          activeOpacity={0.8}
          onPress={handleAuthenticate}
        >
          <Text style={styles.unlockButtonText}>{getButtonLabel()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutLink} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: darkColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    color: darkColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: darkColors.textMuted,
    fontSize: 14,
    marginBottom: 48,
  },
  unlockButton: {
    backgroundColor: darkColors.cyan,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 240,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutLink: {
    marginTop: 24,
    paddingVertical: 12,
  },
  signOutText: {
    color: darkColors.textMuted,
    fontSize: 14,
  },
});
