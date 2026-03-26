import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import PasswordInput from '../../primitives/PasswordInput';
import Input from '../../primitives/Input';
import Button from '../../primitives/Button';
import { authService } from '../../../data/services/authService';
import { typography } from '../../theme/typography';

interface BiometricFallbackScreenProps {
  lastEmail: string | null;
  lastProvider: string | null;
  onSuccess: () => void;
  onUseFullLogin: () => void;
}

export default function BiometricFallbackScreen({
  lastEmail,
  lastProvider,
  onSuccess,
  onUseFullLogin,
}: BiometricFallbackScreenProps) {
  const { colors } = useTheme();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const { showAlert } = useAlert();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Email / password fallback ----------
  const handleEmailSignIn = async () => {
    if (!lastEmail) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(lastEmail, password);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Sign-in failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!lastEmail) return;
    try {
      await authService.resetPassword(lastEmail);
      showAlert({
        title: 'Reset Email Sent',
        message: `A password reset link has been sent to ${lastEmail}.`,
        type: 'info',
      });
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to send reset email. Please try again later.',
        type: 'error',
      });
    }
  };

  // ---------- Google fallback ----------
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success && !result.cancelled) {
        onSuccess();
      } else if (!result.cancelled) {
        setError(result.error || 'Google sign-in failed.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Apple fallback ----------
  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithApple();
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Apple sign-in failed.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Render helpers ----------
  const renderError = () =>
    error ? (
      <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
    ) : null;

  const renderFooter = () => (
    <TouchableOpacity onPress={onUseFullLogin} style={styles.footerLink}>
      <Text style={[styles.footerText, { color: colors.cyan }]}>
        Use a different account
      </Text>
    </TouchableOpacity>
  );

  // ---- Provider: email ----
  const renderEmailFallback = () => (
    <>
      <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
        Sign in to continue
      </Text>

      <Input
        label="Email"
        value={lastEmail ?? ''}
        editable={false}
        containerStyle={styles.fieldGroup}
        style={{ opacity: 0.6 }}
      />

      <PasswordInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
        containerStyle={styles.fieldGroup}
      />

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
        <Text style={[styles.forgotText, { color: colors.cyan }]}>Forgot Password?</Text>
      </TouchableOpacity>

      {renderError()}

      <TouchableOpacity
        onPress={handleEmailSignIn}
        disabled={!password || loading}
        activeOpacity={0.8}
        style={[
          styles.signInBtn,
          { backgroundColor: colors.cyan },
          (!password || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={[styles.signInText, { color: colors.bg }]}>Sign In</Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ---- Provider: google ----
  const renderGoogleFallback = () => (
    <>
      <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
        Sign in to continue
      </Text>

      {renderError()}

      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading}
        activeOpacity={0.8}
        style={[
          styles.socialBtn,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={[styles.socialBtnText, { color: colors.textPrimary }]}>
            Sign in with Google
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ---- Provider: apple (iOS) ----
  const renderAppleFallback = () => (
    <>
      <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
        Sign in to continue
      </Text>

      {renderError()}

      <TouchableOpacity
        onPress={handleAppleSignIn}
        disabled={loading}
        activeOpacity={0.8}
        style={[
          styles.socialBtn,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={[styles.socialBtnText, { color: colors.textPrimary }]}>
            Sign in with Apple
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ---- Provider: apple on Android (Fix 5 / Q5) ----
  const renderAppleOnAndroid = () => (
    <>
      <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
        Sign in with a different method
      </Text>
      <Text style={[typography.bodySmall, styles.subtitle, { color: colors.textSecondary }]}>
        Apple Sign-In is not available on this device
      </Text>

      <Button
        title="Go to Login"
        onPress={onUseFullLogin}
        variant="primary"
        style={styles.goToLoginBtn}
      />
    </>
  );

  // ---- Provider: null / unknown ----
  const renderGenericFallback = () => (
    <>
      <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
        Please sign in
      </Text>

      <Button
        title="Go to Login"
        onPress={onUseFullLogin}
        variant="primary"
        style={styles.goToLoginBtn}
      />
    </>
  );

  // ---------- Choose which panel to render ----------
  const renderContent = () => {
    switch (lastProvider) {
      case 'email':
        return renderEmailFallback();
      case 'google':
        return renderGoogleFallback();
      case 'apple':
        if (Platform.OS === 'ios') return renderAppleFallback();
        return renderAppleOnAndroid();
      default:
        return renderGenericFallback();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        {renderContent()}
        {renderFooter()}
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
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  signInBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signInText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
  socialBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  goToLoginBtn: {
    marginTop: 8,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
