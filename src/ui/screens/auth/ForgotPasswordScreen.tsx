import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { authService } from '../../../data/services/authService';
import { useAlert } from '../../context/AlertContext';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import type { RootStackScreenProps } from '../../navigation/types';

export default function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await authService.resetPassword(email.trim());
      showAlert({
        title: 'Email Sent',
        message: 'Check your inbox for password reset instructions.',
        type: 'success',
        onConfirm: () => navigation.goBack(),
      });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to send reset email', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your email to receive a reset link</Text>
      </View>

      <Input
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        containerStyle={styles.field}
      />

      <Button
        title="Send Reset Link"
        onPress={handleReset}
        loading={loading}
        disabled={!email}
        style={styles.button}
      />

      <Button
        title="Back to Sign In"
        onPress={() => navigation.goBack()}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodySmall, marginTop: 4, textAlign: 'center' },
  field: { marginBottom: 16 },
  button: { marginTop: 8, marginBottom: 16 },
});
