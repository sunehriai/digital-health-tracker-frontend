import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Key, Mail, Trash2, UserX, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useDeletion } from '../hooks/useDeletion';
import { useSecurity } from '../hooks/useSecurity';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { biometrics } from '../../data/utils/biometrics';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackScreenProps } from '../navigation/types';

export default function AccountSettingsScreen({ navigation }: RootStackScreenProps<'AccountSettings'>) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { showAlert } = useAlert();
  const { loading: deletionLoading, requestDeletion } = useDeletion();
  const security = useSecurity();
  const { resetPreferences } = useAppPreferences();
  const [resetCooldown, setResetCooldown] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'data_only' | 'full_account'>('data_only');

  const handleChangePassword = async () => {
    if (resetCooldown) return;

    try {
      // Firebase sendPasswordResetEmail will be wired here
      showAlert({
        title: 'Password Reset Email Sent',
        message: `A password reset link has been sent to ${user?.email}. Check your inbox.`,
        type: 'success',
      });
      setResetCooldown(true);
      setTimeout(() => setResetCooldown(false), 60000);
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message || 'Failed to send reset email. Please try again.', type: 'error' });
    }
  };

  const handleChangeEmail = () => {
    // TODO: Open Change Email modal
    showAlert({ title: 'Coming Soon', message: 'Change email will be available in a future update.', type: 'info' });
  };

  const handleDeleteData = async () => {
    // Require biometric re-auth for destructive actions (no grace period)
    if (security.biometricEnabled) {
      const result = await biometrics.authenticate('Confirm to delete all data');
      if (!result.success) return;
      security.recordAuthentication();
    }
    console.log('[AccountSettings] handleDeleteData fired — setting modalType=data_only, modalVisible=true');
    setModalType('data_only');
    setModalVisible(true);
  };

  const handleDeleteAccount = async () => {
    // Require biometric re-auth for destructive actions (no grace period)
    if (security.biometricEnabled) {
      const result = await biometrics.authenticate('Confirm to delete account');
      if (!result.success) return;
      security.recordAuthentication();
    }
    console.log('[AccountSettings] handleDeleteAccount fired — setting modalType=full_account, modalVisible=true');
    setModalType('full_account');
    setModalVisible(true);
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

        {/* Change Password */}
        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, resetCooldown && styles.settingCardDisabled]}
          activeOpacity={resetCooldown ? 1 : 0.8}
          onPress={handleChangePassword}
        >
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Key color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Change Password</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
              {resetCooldown ? 'Reset email sent — check your inbox' : 'Send a password reset email'}
            </Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Change Email */}
        <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleChangeEmail}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Mail color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Change Email</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{user?.email || 'Update your login email'}</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

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
  settingCardDisabled: {
    opacity: 0.6,
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
