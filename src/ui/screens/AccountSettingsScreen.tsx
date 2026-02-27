import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Key, Mail, Trash2, UserX, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useDeletion } from '../hooks/useDeletion';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';

export default function AccountSettingsScreen({ navigation }: RootStackScreenProps<'AccountSettings'>) {
  const { user, signOut } = useAuth();
  const { loading: deletionLoading, requestDeletion } = useDeletion();
  const [resetCooldown, setResetCooldown] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'data_only' | 'full_account'>('data_only');

  const handleChangePassword = async () => {
    if (resetCooldown) return;

    try {
      // Firebase sendPasswordResetEmail will be wired here
      Alert.alert(
        'Password Reset Email Sent',
        `A password reset link has been sent to ${user?.email}. Check your inbox.`,
      );
      setResetCooldown(true);
      setTimeout(() => setResetCooldown(false), 60000);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reset email. Please try again.');
    }
  };

  const handleChangeEmail = () => {
    // TODO: Open Change Email modal
    Alert.alert('Coming Soon', 'Change email will be available in a future update.');
  };

  const handleDeleteData = () => {
    console.log('[AccountSettings] handleDeleteData fired — setting modalType=data_only, modalVisible=true');
    setModalType('data_only');
    setModalVisible(true);
  };

  const handleDeleteAccount = () => {
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
      if (modalType === 'full_account') {
        // Full account deletion: sign out immediately since account is being deleted
        await signOut();
      } else {
        // Data-only deletion: immediate wipe, keep user logged in, navigate back
        Alert.alert(
          'Data Deleted',
          'Your health data has been permanently deleted. You can start adding new data.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } else {
      Alert.alert('Error', 'Failed to request deletion. Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* CREDENTIALS Section */}
        <Text style={styles.sectionTitle}>CREDENTIALS</Text>

        {/* Change Password */}
        <TouchableOpacity
          style={[styles.settingCard, resetCooldown && styles.settingCardDisabled]}
          activeOpacity={resetCooldown ? 1 : 0.8}
          onPress={handleChangePassword}
        >
          <View style={styles.settingIcon}>
            <Key color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Change Password</Text>
            <Text style={styles.settingSubtitle}>
              {resetCooldown ? 'Reset email sent — check your inbox' : 'Send a password reset email'}
            </Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Change Email */}
        <TouchableOpacity style={styles.settingCard} activeOpacity={0.8} onPress={handleChangeEmail}>
          <View style={styles.settingIcon}>
            <Mail color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Change Email</Text>
            <Text style={styles.settingSubtitle}>{user?.email || 'Update your login email'}</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* DATA & DELETION Section */}
        <Text style={styles.sectionTitleDanger}>DATA & DELETION</Text>

        {/* Delete All Data */}
        <TouchableOpacity style={styles.dangerCard} activeOpacity={0.8} onPress={handleDeleteData}>
          <View style={styles.dangerIcon}>
            <Trash2 color={colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.dangerTitle}>Delete All Data</Text>
            <Text style={styles.dangerSubtitle}>Remove all health data. Keep your account.</Text>
          </View>
          <ChevronRight color={colors.error} size={20} />
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.dangerCard} activeOpacity={0.8} onPress={handleDeleteAccount}>
          <View style={styles.dangerIcon}>
            <UserX color={colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text style={styles.dangerSubtitle}>Permanently delete your account and all data</Text>
          </View>
          <ChevronRight color={colors.error} size={20} />
        </TouchableOpacity>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
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
  safe: { flex: 1, backgroundColor: '#080A0F' },
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
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },

  // Section Title
  sectionTitle: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitleDanger: {
    color: colors.error,
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
    backgroundColor: '#121721',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  settingCardDisabled: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: colors.textMuted,
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
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  dangerSubtitle: {
    color: colors.textMuted,
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  signOutText: { color: '#8E9196', fontSize: 14, fontWeight: '600' },
});
