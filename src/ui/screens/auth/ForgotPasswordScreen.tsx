import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { authService } from '../../../data/services/authService';
import Button from '../../primitives/Button';
import Input from '../../primitives/Input';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import type { RootStackScreenProps } from '../../navigation/types';

export default function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await authService.resetPassword(email.trim());
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
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
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  field: { marginBottom: 16 },
  button: { marginTop: 8, marginBottom: 16 },
});
