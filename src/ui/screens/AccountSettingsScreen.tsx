import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Key, Mail, Trash2, UserX, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useDeletion } from '../hooks/useDeletion';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { authService } from '../../data/services/authService';
import PasswordInput from '../primitives/PasswordInput';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackScreenProps } from '../navigation/types';

export default function AccountSettingsScreen({ navigation }: RootStackScreenProps<'AccountSettings'>) {
  const { colors } = useTheme();
  const { user, signOut, isEmailVerified } = useAuth();
  const { showAlert } = useAlert();
  const { loading: deletionLoading, requestDeletion } = useDeletion();
  const { resetPreferences } = useAppPreferences();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'data_only' | 'full_account'>('data_only');

  // Tier 3 password re-auth state
  const [tier3Visible, setTier3Visible] = useState(false);
  const [tier3Password, setTier3Password] = useState('');
  const [tier3Error, setTier3Error] = useState('');
  const [tier3Loading, setTier3Loading] = useState(false);
  const [tier3Action, setTier3Action] = useState<'delete_data' | 'delete_account' | null>(null);

  // BP-012: Explicit match — do NOT use `auth_provider !== 'email'` because
  // undefined !== 'email' is true, which would hide the card when backend is unreachable.
  const isSocialUser = user?.auth_provider === 'google' || user?.auth_provider === 'apple';

  const handleChangePassword = () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Verify',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    navigation.navigate('ChangePassword');
  };

  const handleChangeEmail = () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Verify',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    if (isSocialUser) {
      const provider = user?.auth_provider === 'google' ? 'Google' : 'Apple';
      Alert.alert(
        'Email Managed Externally',
        `Your email is managed by ${provider}. To change it, update your ${provider} account settings.`,
      );
      return;
    }
    navigation.navigate('ChangeEmail');
  };

  const handleDeleteData = async () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Verify',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    if (isSocialUser) {
      // Social users: re-auth via provider
      try {
        if (user?.auth_provider === 'google') {
          await authService.reauthenticateWithGoogle();
        } else {
          await authService.reauthenticateWithApple();
        }
        // Re-auth succeeded, proceed with action
        setModalType('data_only');
        setModalVisible(true);
      } catch (e: any) {
        if (e.message === 'Cancelled') return;
        showAlert({ title: 'Error', message: e.message || 'Re-authentication failed', type: 'error' });
      }
    } else {
      // Email users: show password modal
      setTier3Action('delete_data');
      setTier3Password('');
      setTier3Error('');
      setTier3Visible(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Verify',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    if (isSocialUser) {
      // Social users: re-auth via provider
      try {
        if (user?.auth_provider === 'google') {
          await authService.reauthenticateWithGoogle();
        } else {
          await authService.reauthenticateWithApple();
        }
        // Re-auth succeeded, proceed with action
        setModalType('full_account');
        setModalVisible(true);
      } catch (e: any) {
        if (e.message === 'Cancelled') return;
        showAlert({ title: 'Error', message: e.message || 'Re-authentication failed', type: 'error' });
      }
    } else {
      // Email users: show password modal
      setTier3Action('delete_account');
      setTier3Password('');
      setTier3Error('');
      setTier3Visible(true);
    }
  };

  const handleTier3Submit = async () => {
    if (!tier3Password) return;
    setTier3Loading(true);
    setTier3Error('');
    try {
      await authService.reauthenticate(user?.email || '', tier3Password);
      // Re-auth succeeded
      setTier3Visible(false);
      if (tier3Action === 'delete_data') {
        setModalType('data_only');
        setModalVisible(true);
      } else if (tier3Action === 'delete_account') {
        setModalType('full_account');
        setModalVisible(true);
      }
    } catch (e: any) {
      console.log('[AccountSettings] reauth error:', e.message, 'email used:', user?.email);
      setTier3Error(e.message || 'Incorrect password');
    } finally {
      setTier3Loading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    console.log('[AccountSettings] handleConfirmDeletion fired — modalType:', modalType);
    const success = await requestDeletion(modalType);
    console.log('[AccountSettings] requestDeletion returned:', success);
    setModalVisible(false);
    if (success) {
      // Reset app preferences to defaults (haptic/sound module refs + AsyncStorage keys)
      await resetPreferences();
      if (modalType === 'full_account') {
        // Revoke Google session so "Continue with Google" won't silently re-auth
        if (isSocialUser && user?.auth_provider === 'google') {
          await authService.revokeGoogleAccess();
        }
        // Full account deletion: sign out immediately since account is being deleted
        await signOut();
      } else {
        // Data-only deletion: immediate wipe, keep user logged in, navigate back
        showAlert({
          title: 'Data Deleted',
          message: 'Your health data has been permanently deleted. You can start adding new data.',
          type: 'success',
          onConfirm: () => navigation.goBack(),
        });
      }
    } else {
      showAlert({ title: 'Error', message: 'Failed to request deletion. Please check your connection and try again.', type: 'error' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* CREDENTIALS Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>CREDENTIALS</Text>

        {/* Change Password — hidden for Google/Apple users (D19) */}
        {!isSocialUser && (
          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={handleChangePassword}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
              <Key color={colors.cyan} size={20} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Change Password</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Update your password</Text>
            </View>
            <ChevronRight color={colors.textMuted} size={20} />
          </TouchableOpacity>
        )}

        {/* Change Email */}
        <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleChangeEmail}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Mail color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Change Email</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
              {isSocialUser
                ? `Your email is managed by ${user?.auth_provider === 'google' ? 'Google' : 'Apple'}`
                : user?.email || 'Update your login email'}
            </Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Verify Email — shown only for unverified email users */}
        {!isEmailVerified && user?.auth_provider === 'email' && (
          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                await authService.sendVerificationEmail();
                showAlert({
                  title: 'Verification Link Sent',
                  message: 'Check your inbox (and spam folder) for the verification link.',
                  type: 'success',
                });
              } catch (e: any) {
                showAlert({ title: 'Error', message: e.message || 'Failed to send verification email', type: 'error' });
              }
            }}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Mail color="#F59E0B" size={20} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: '#F59E0B' }]}>Verify Email</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Tap to resend verification link</Text>
            </View>
            <ChevronRight color="#F59E0B" size={20} />
          </TouchableOpacity>
        )}

        {/* DATA & DELETION Section */}
        <Text style={[styles.sectionTitleDanger, { color: colors.error }]}>DATA & DELETION</Text>

        {/* Delete All Data */}
        <TouchableOpacity style={styles.dangerCard} activeOpacity={0.8} onPress={handleDeleteData}>
          <View style={styles.dangerIcon}>
            <Trash2 color={colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.dangerTitle, { color: colors.error }]}>Delete All Data</Text>
            <Text style={[styles.dangerSubtitle, { color: colors.textMuted }]}>Remove all health data. Keep your account.</Text>
          </View>
          <ChevronRight color={colors.error} size={20} />
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.dangerCard} activeOpacity={0.8} onPress={handleDeleteAccount}>
          <View style={styles.dangerIcon}>
            <UserX color={colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.dangerTitle, { color: colors.error }]}>Delete Account</Text>
            <Text style={[styles.dangerSubtitle, { color: colors.textMuted }]}>Permanently delete your account and all data</Text>
          </View>
          <ChevronRight color={colors.error} size={20} />
        </TouchableOpacity>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.borderSubtle }]} onPress={signOut}>
            <LogOut color="#8E9196" size={20} strokeWidth={2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Tier 3 Password Re-auth Modal */}
      <Modal visible={tier3Visible} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>Confirm Your Identity</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>Enter your password to continue</Text>
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={tier3Password}
              onChangeText={(text) => { setTier3Password(text); if (tier3Error) setTier3Error(''); }}
            />
            {tier3Error ? <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{tier3Error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setTier3Visible(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTier3Submit}
                disabled={!tier3Password || tier3Loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.error, alignItems: 'center', opacity: !tier3Password || tier3Loading ? 0.5 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{tier3Loading ? 'Verifying...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal — conditional mount to match LogRefillSheet pattern */}
      {modalVisible && (
        <DeleteConfirmationModal
          visible
          deletionType={modalType}
          loading={deletionLoading}
          onConfirm={handleConfirmDeletion}
          onCancel={() => { console.log('[AccountSettings] onCancel fired'); setModalVisible(false); }}
        />
      )}
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

  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitleDanger: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },

  // Danger Card
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  dangerSubtitle: {
    fontSize: 12,
  },

  // Sign Out
  signOutSection: {
    marginTop: 28,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  signOutText: { color: '#8E9196', fontSize: 14, fontWeight: '600' },
});
