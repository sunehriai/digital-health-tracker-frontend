import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  TouchableOpacity,
  Linking,
} from 'react-native';
// @ts-ignore — @expo/vector-icons ships without type declarations in some setups
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import PasswordInput from '../../primitives/PasswordInput';
import SocialLoginRow from '../../components/SocialLoginRow';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { useAlert } from '../../context/AlertContext';
import type { RootStackScreenProps } from '../../navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TERMS_URL = 'https://vitaquest.app/terms';
const PRIVACY_URL = 'https://vitaquest.app/privacy';

export default function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>) {
  const { colors } = useTheme();
  const { signUp, signInWithGoogle, signInWithApple, loading: authLoading, error: authError, clearError } = useAuth();
  const { showAlert } = useAlert();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Use local loading/error to prevent navigator re-render from resetting the stack
  const loading = localLoading || authLoading;
  const error = localError || authError;

  // D14 — Android back button intercept while loading
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loadingRef.current) return true; // block back while loading
      return false;
    });
    return () => handler.remove();
  }, []);

  const validateEmail = (value: string) => {
    if (value && !EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const validateConfirmPassword = () => {
    if (confirmPassword && confirmPassword !== password) {
      setConfirmError('Passwords don\'t match');
    } else {
      setConfirmError('');
    }
  };

  const handleOpenLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      showAlert({ title: 'Coming Soon', message: 'This page is not yet available.', type: 'info' });
    }
  };

  const handleSignUp = async () => {
    clearError();
    setLocalError(null);

    const trimmedEmail = email.trim().toLowerCase();

    // Client-side email validation (D13)
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Confirm password validation
    if (confirmPassword !== password) {
      setConfirmError('Passwords don\'t match');
      return;
    }

    setLocalLoading(true);
    try {
      const result = await signUp(trimmedEmail, password, displayName.trim() || undefined);
      if (!result.success && result.error) {
        setLocalError(result.error);
      }
    } catch (e: any) {
      setLocalError(e.message || 'Sign up failed');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your longevity journey</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Display Name"
            placeholder="John Doe"
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
            containerStyle={styles.field}
          />
          <View style={styles.field}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              onBlur={() => validateEmail(email)}
              editable={!loading}
            />
            {emailError ? (
              <Text style={[styles.inlineError, { color: colors.error }]}>{emailError}</Text>
            ) : null}
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              Tip: This will be your permanent login ID.
            </Text>
          </View>
          <PasswordInput
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            showStrength
            containerStyle={styles.field}
          />
          <View style={styles.field}>
            <PasswordInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmError) setConfirmError('');
              }}
              onBlur={validateConfirmPassword}
              editable={!loading}
            />
            {confirmError ? (
              <Text style={[styles.inlineError, { color: colors.error }]}>{confirmError}</Text>
            ) : null}
          </View>

          {/* Terms of Service checkbox (D5) */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setTermsAccepted((prev) => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              style={[
                styles.checkbox,
                {
                  borderColor: termsAccepted ? colors.cyan : colors.border,
                  backgroundColor: termsAccepted ? colors.cyan : 'transparent',
                },
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={12} color="white" />
              )}
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text
                style={[styles.termsLink, { color: colors.cyan }]}
                onPress={() => handleOpenLink(TERMS_URL)}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={[styles.termsLink, { color: colors.cyan }]}
                onPress={() => handleOpenLink(PRIVACY_URL)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={!email || !password || !confirmPassword || confirmPassword !== password || !termsAccepted || loading || !!emailError}
            style={styles.button}
          />

          <SocialLoginRow
            onGooglePress={async () => {
              await signInWithGoogle();
            }}
            onApplePress={async () => {
              await signInWithApple();
            }}
            loading={loading}
            disabled={!termsAccepted}
            googleLabel="Sign up with Google"
            appleLabel="Sign up with Apple"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account?</Text>
          <Button
            title="Sign In"
            onPress={() => navigation.goBack()}
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
  title: { ...typography.h1 },
  subtitle: { ...typography.bodySmall, marginTop: 4 },
  form: { gap: 8 },
  field: { marginBottom: 12 },
  inlineError: { fontSize: 12, marginTop: 4 },
  error: { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  button: { marginTop: 8 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 13 },
});
