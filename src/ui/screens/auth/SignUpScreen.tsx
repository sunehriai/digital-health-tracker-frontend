import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import type { RootStackScreenProps } from '../../navigation/types';

export default function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>) {
  const { signUp, loading, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    clearError();
    const result = await signUp(email.trim(), password, displayName.trim() || undefined);
    if (!result.success) {
      // error is set via auth context
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your longevity journey</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Display Name"
            placeholder="John Doe"
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            containerStyle={styles.field}
          />
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
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            containerStyle={styles.field}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={!email || !password}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  form: { gap: 8 },
  field: { marginBottom: 12 },
  error: { color: colors.error, fontSize: 13, textAlign: 'center', marginVertical: 8 },
  button: { marginTop: 8 },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { color: colors.textMuted, fontSize: 13 },
});
