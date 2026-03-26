import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, BackHandler, TouchableOpacity, TextInput } from 'react-native';
// @ts-ignore – @expo/vector-icons types may not resolve in strict mode
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../primitives/Button';
import SocialLoginRow from '../../components/SocialLoginRow';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import type { RootStackScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
  const { colors } = useTheme();
  const { signIn, signInWithGoogle, signInWithApple, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [secure, setSecure] = useState(true);

  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Android back button intercept (D14)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => loadingRef.current);
    return () => sub.remove();
  }, []);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    clearError();
    const result = await signIn(email.trim().toLowerCase(), password);
    if (!result.success) {
      // error is set via auth context
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.cyan }]}>VitaQuest</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Longevity Companion</Text>

          {/* Begin Your Health Quest badge */}
          <View style={[styles.questBadge, { borderColor: colors.cyan, backgroundColor: 'rgba(0, 209, 255, 0.08)' }]}>
            <Text style={{ fontSize: 14 }}>✨</Text>
            <Text style={[styles.questBadgeText, { color: colors.cyan }]}>Begin Your Health Quest</Text>
          </View>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <View style={[
              styles.inputRow,
              { backgroundColor: colors.bgInput, borderColor: emailFocused ? colors.cyan : colors.border },
              emailError ? { borderColor: colors.error } : null,
            ]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text: string) => { setEmail(text); setEmailError(''); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  if (email.trim() && !validateEmail(email.trim())) setEmailError('Please enter a valid email address');
                }}
                editable={!loading}
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
            </View>
            {emailError ? <Text style={{ color: colors.error, fontSize: 13, marginTop: 4 }}>{emailError}</Text> : null}
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
            <View style={[
              styles.inputRow,
              { backgroundColor: colors.bgInput, borderColor: passwordFocused ? colors.cyan : colors.border },
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={secure}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                editable={!loading}
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => setSecure(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={secure ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password — right-aligned */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={[styles.forgotText, { color: colors.cyan }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>

        {/* Sign In button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={!email || !password || loading}
          activeOpacity={0.8}
          style={[
            styles.signInBtn,
            { backgroundColor: colors.cyan },
            (!email || !password || loading) && styles.disabled,
          ]}
        >
          {loading ? (
            <Text style={[styles.signInText, { color: colors.bg }]}>Signing In...</Text>
          ) : (
            <Text style={[styles.signInText, { color: colors.bg }]}>Sign In  →</Text>
          )}
        </TouchableOpacity>

        {/* Social login */}
        <SocialLoginRow
          onGooglePress={async () => {
            const result = await signInWithGoogle();
          }}
          onApplePress={async () => {
            const result = await signInWithApple();
          }}
          loading={loading}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Don't have an account?{'  '}
            <Text
              style={{ color: colors.cyan, fontWeight: '600' }}
              onPress={() => navigation.navigate('SignUp')}
            >
              Sign up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { ...typography.h1, fontSize: 36, fontWeight: '700' },
  subtitle: { ...typography.bodySmall, marginTop: 4, fontSize: 15 },
  questBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
    gap: 6,
  },
  questBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Form card
  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },

  error: { fontSize: 13, textAlign: 'center', marginTop: 8 },

  // Sign In button
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

  // Footer
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
});
