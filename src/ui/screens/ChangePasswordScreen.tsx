import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../theme/ThemeContext';
import { authService } from '../../data/services/authService';
import PasswordInput from '../primitives/PasswordInput';
import Button from '../primitives/Button';
import type { RootStackScreenProps } from '../navigation/types';

export default function ChangePasswordScreen({
  navigation,
}: RootStackScreenProps<'ChangePassword'>) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allFilled =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmNewPassword.length > 0;

  const passwordsMatch = newPassword === confirmNewPassword;
  const passwordDiffers = newPassword !== currentPassword;

  const isValid = allFilled && passwordsMatch && passwordDiffers;

  const getInlineError = (): string => {
    if (newPassword.length > 0 && currentPassword.length > 0 && !passwordDiffers) {
      return 'New password must differ from current';
    }
    if (confirmNewPassword.length > 0 && newPassword.length > 0 && !passwordsMatch) {
      return 'Passwords don\'t match';
    }
    return error;
  };

  const inlineError = getInlineError();

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setError('');
    setLoading(true);

    try {
      await authService.reauthenticate(user?.email || '', currentPassword);
    } catch {
      setError('Current password is incorrect');
      setLoading(false);
      return;
    }

    try {
      await authService.updatePassword(newPassword);

      setLoading(false);
      showAlert({
        title: 'Password Updated',
        message: 'Password updated successfully',
        type: 'success',
        onConfirm: () => navigation.goBack(),
      });
    } catch (e: any) {
      setError(e.message || 'Failed to update password');
      setLoading(false);
    }
  };

  const handleForgotCurrent = async () => {
    try {
      await authService.resetPassword(user?.email || '');
      showAlert({
        title: 'Reset Link Sent',
        message: 'A password reset link has been sent to your email. Check your inbox.',
        type: 'success',
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e.message || 'Failed to send reset email',
        type: 'error',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Change Password
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Password */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current Password</Text>
          <PasswordInput
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              setError('');
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* New Password */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
          <PasswordInput
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setError('');
            }}
            showStrength
            containerStyle={styles.fieldContainer}
          />

          {/* Confirm New Password */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Confirm New Password
          </Text>
          <PasswordInput
            placeholder="Re-enter new password"
            value={confirmNewPassword}
            onChangeText={(text) => {
              setConfirmNewPassword(text);
              setError('');
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* Inline Error */}
          {inlineError.length > 0 && (
            <Text style={[styles.errorText, { color: colors.error }]}>{inlineError}</Text>
          )}

          {/* Submit Button */}
          <Button
            title="Update Password"
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={!isValid}
            style={styles.submitBtn}
          />

          {/* Forgot Current Password Link */}
          <TouchableOpacity onPress={handleForgotCurrent} style={styles.forgotLink}>
            <Text style={[styles.forgotText, { color: colors.textMuted }]}>
              Forgot current password?
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },

  // Form
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
  },
  submitBtn: {
    marginTop: 28,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
