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
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import type { RootStackScreenProps } from '../navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailScreen({ navigation }: RootStackScreenProps<'ChangeEmail'>) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailBlur = () => {
    const trimmed = newEmail.trim();
    if (trimmed.length > 0 && !EMAIL_REGEX.test(trimmed)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const handleEmailChange = (text: string) => {
    setNewEmail(text);
    if (emailError) setEmailError('');
    if (error) setError('');
  };

  const handlePasswordChange = (text: string) => {
    setCurrentPassword(text);
    if (error) setError('');
  };

  const isSubmitDisabled =
    !currentPassword.trim() || !newEmail.trim() || !!emailError || loading;

  const handleSubmit = async () => {
    const trimmedEmail = newEmail.trim().toLowerCase();

    // Client-side email validation
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Re-authenticate
      await authService.reauthenticate(user?.email || '', currentPassword);
    } catch (e: any) {
      setError('Current password is incorrect');
      setLoading(false);
      return;
    }

    try {
      // Step 2: Send verification to new email
      await authService.verifyBeforeUpdateEmail(trimmedEmail);

      showAlert({
        title: 'Verification Link Sent',
        message: `A verification link has been sent to ${trimmedEmail}. Your email will update once you verify the link.`,
        type: 'success',
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('already') || msg.includes('email-already-in-use')) {
        setError('This email is already associated with another account.');
      } else {
        setError(msg || 'Failed to update email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Change Email</Text>
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
          {/* Current email display */}
          <Text style={[styles.currentEmailLabel, { color: colors.textMuted }]}>
            Current email
          </Text>
          <Text style={[styles.currentEmail, { color: colors.textSecondary }]}>
            {user?.email || ''}
          </Text>

          {/* Current Password */}
          <PasswordInput
            label="Current Password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChangeText={handlePasswordChange}
            containerStyle={styles.fieldContainer}
          />

          {/* New Email */}
          <Input
            label="New Email"
            placeholder="Enter your new email address"
            value={newEmail}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError || undefined}
            containerStyle={styles.fieldContainer}
          />

          {/* Inline error */}
          {!!error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          {/* Submit button */}
          <Button
            title="Update Email"
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

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

  // Current email
  currentEmailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentEmail: {
    fontSize: 15,
    marginBottom: 24,
  },

  // Fields
  fieldContainer: {
    marginBottom: 16,
  },

  // Error
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },

  // Submit
  submitBtn: {
    marginTop: 8,
  },
});
