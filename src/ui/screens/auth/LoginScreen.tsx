import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import type { RootStackScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
  const { colors } = useTheme();
  const { signIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearError();
    const result = await signIn(email.trim(), password);
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
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.cyan }]}>Vision</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>The Longevity Companion</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            containerStyle={styles.field}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
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
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 13 },
});
