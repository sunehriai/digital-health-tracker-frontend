import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, BackHandler, TouchableOpacity } from 'react-native';
// @ts-ignore – @expo/vector-icons types may not resolve in strict mode
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import PasswordInput from '../../primitives/PasswordInput';
import SocialLoginRow from '../../components/SocialLoginRow';
import { useTheme } from '../../theme/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { typography } from '../../theme/typography';
import { biometricLogin } from '../../../data/utils/biometricLogin';
import { biometrics } from '../../../data/utils/biometrics';
import type { RootStackScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
  const { colors } = useTheme();
  const { signIn, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [hasBiometricCreds, setHasBiometricCreds] = useState(false);
  const [biometricFailCount, setBiometricFailCount] = useState(0);

  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Android back button intercept (D14)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => loadingRef.current);
    return () => sub.remove();
  }, []);

  // Biometric auto-login check on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasCreds = await biometricLogin.hasCreds();
      if (mounted) setHasBiometricCreds(hasCreds);

      if (hasCreds) {
        // Auto-trigger biometric prompt with 500ms delay
        setTimeout(async () => {
          if (!mounted) return;
          await attemptBiometricLogin();
        }, 500);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const attemptBiometricLogin = async () => {
    try {
      const result = await biometrics.authenticate('Sign in to VitaQuest');
      if (result.success) {
        const creds = await biometricLogin.getCredentials();
        if (creds) {
          await signIn(creds.email, creds.password);
        }
      } else {
        setBiometricFailCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            biometricLogin.clearCredentials();
            setHasBiometricCreds(false);
          }
          return newCount;
        });
      }
    } catch {
      // Biometric not available or error — fall through to manual entry
    }
  };

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    clearError();
    const result = await signIn(email.trim().toLowerCase(), password);
    if (result.success && result.shouldPromptBiometric) {
      showAlert({
        title: 'Enable Biometric Login?',
        message: 'Use FaceID or fingerprint to sign in faster next time.',
        type: 'info',
        confirmLabel: 'Enable',
        cancelLabel: 'Not Now',
        onConfirm: async () => {
          await biometricLogin.storeCredentials(email.trim().toLowerCase(), password);
        },
        onCancel: async () => {
          await biometricLogin.setDeclined();
        },
      });
    } else if (!result.success) {
      // error is set via auth context
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.cyan }]}>VitaQuest</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Longevity Companion</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text: string) => { setEmail(text); setEmailError(''); }}
            onBlur={() => { if (email.trim() && !validateEmail(email.trim())) setEmailError('Please enter a valid email address'); }}
            editable={!loading}
            containerStyle={styles.field}
          />
          {emailError ? <Text style={{ color: colors.error, fontSize: 13, marginTop: -8, marginBottom: 8 }}>{emailError}</Text> : null}
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            containerStyle={styles.field}
          />

          {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
            style={styles.button}
          />

          <Button
            title="Forgot Password?"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="ghost"
          />

          {hasBiometricCreds && (
            <TouchableOpacity
              style={[styles.biometricBtn, { borderColor: colors.border }]}
              onPress={attemptBiometricLogin}
              disabled={loading}
            >
              <Ionicons name="finger-print" size={24} color={colors.cyan} />
            </TouchableOpacity>
          )}

          <SocialLoginRow
            onGooglePress={async () => {
              const result = await signInWithGoogle();
              // cancelled = no-op, error is handled by useAuth context
            }}
            onApplePress={async () => {
              const result = await signInWithApple();
            }}
            loading={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Don't have an account?</Text>
          <Button
            title="Create Account"
            onPress={() => navigation.navigate('SignUp')}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { ...typography.h1, fontSize: 36 },
  subtitle: { ...typography.bodySmall, marginTop: 4 },
  form: { gap: 8 },
  field: { marginBottom: 12 },
  error: { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  button: { marginTop: 8 },
  biometricBtn: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 13 },
});
