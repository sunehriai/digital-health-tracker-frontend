// Force-dark: This screen always uses dark theme regardless of user preference
import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { X, Edit3 } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useMedications } from '../hooks/useMedications';
import { darkColors } from '../theme/ThemeContext';
import { useGamification } from '../hooks/useGamification';
import { isFeatureUnlocked } from '../../domain/utils/tierGating';
import LockedFeatureScreen from '../components/LockedFeatureScreen';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';
import type { RootStackScreenProps } from '../navigation/types';

// Format scheduled time (HH:MM) to AM/PM format
const formatScheduledTime = (time: string): string => {
  if (!time) return '—';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Format frequency for display
const formatFrequency = (frequency: string, customDays?: number[] | null): string => {
  switch (frequency) {
    case 'daily':
      return 'Once Daily';
    case 'every_other_day':
      return 'Every Other Day';
    case 'custom':
      return 'Custom Schedule';
    default:
      return frequency;
  }
};

export default function EmergencyVaultScreen({ navigation }: RootStackScreenProps<'EmergencyVault'>) {
  const { user } = useAuth();
  const { vault, loading: vaultLoading, fetchVault } = useVault();
  const { activeMedications, loading: medsLoading } = useMedications();
  const { currentTier, totalXp, loading: gamLoading } = useGamification();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('EmergencyVault');

  // Re-fetch vault data when screen regains focus (e.g. after editing in PersonalInfo)
  useFocusEffect(
    useCallback(() => {
      fetchVault();
    }, [fetchVault])
  );

  const loading = vaultLoading || medsLoading;

  // Wait for data before tier gate check
  if (gamLoading || vaultLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.authContainer}>
          <ActivityIndicator color={darkColors.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Feature gate: Emergency Vault requires Tier 2 (grandfather clause: existing vault data)
  if (!isFeatureUnlocked('emergency_vault', currentTier, vault != null)) {
    return (
      <LockedFeatureScreen
        featureLabel="Emergency Vault"
        requiredTier={2}
        currentTier={currentTier}
        currentXp={totalXp}
      />
    );
  }

  const computedAge = user?.date_of_birth
    ? Math.floor((Date.now() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const allergiesList = vault?.allergies || [];
  const conditionsList = vault?.conditions || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color={darkColors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={styles.closeText}>Close</Text>
        </View>

        <Text style={styles.title}>Emergency Medical Summary</Text>

        {/* Allergies Banner */}
        <View style={styles.allergiesBanner}>
          <Text style={styles.allergiesText}>
            ALLERGIES: {allergiesList.length > 0 ? allergiesList.join(', ').toUpperCase() : 'NONE RECORDED'}
          </Text>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>BLOOD</Text>
            <Text style={styles.statValue}>{vault?.blood_type || '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>WEIGHT</Text>
            <Text style={styles.statValue}>{vault?.weight ? `${vault.weight}lb` : '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AGE</Text>
            <Text style={styles.statValue}>{computedAge ?? '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CONDITION</Text>
            <Text style={styles.statValue}>{conditionsList.length > 0 ? conditionsList[0] : 'None'}</Text>
          </View>
        </View>

        {/* Active Medications Section */}
        <Text style={styles.sectionTitle}>ACTIVE MEDICATIONS</Text>

        {activeMedications.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No active medications</Text>
          </View>
        ) : (
          <View style={styles.medicationsList}>
            {activeMedications.map((med) => (
              <View key={med.id} style={styles.medicationItem}>
                <View style={styles.medicationLeft}>
                  <Text style={styles.medicationName}>{med.name}</Text>
                  <Text style={styles.medicationDosage}>
                    {med.strength || ''}{med.strength ? ', ' : ''}{formatFrequency(med.frequency, med.custom_days)}
                  </Text>
                </View>
                <View style={styles.medicationRight}>
                  <Text style={styles.lastTakenLabel}>Scheduled:</Text>
                  <Text style={styles.lastTakenTime}>{formatScheduledTime(med.time_of_day)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Medical History Section */}
        <Text style={styles.sectionTitle}>MEDICAL HISTORY</Text>

        <View style={styles.historySection}>
          <Text style={styles.historySubtitle}>CHRONIC CONDITIONS</Text>
          {conditionsList.length === 0 ? (
            <Text style={styles.historyEmpty}>No conditions recorded</Text>
          ) : (
            conditionsList.map((condition, index) => (
              <Text key={index} style={styles.historyItem}>• {condition}</Text>
            ))
          )}
        </View>

        {/* Emergency Contacts */}
        {vault?.medical_contacts && vault.medical_contacts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
            <View style={styles.contactsList}>
              {vault.medical_contacts.map((contact, index) => (
                <View key={index} style={styles.contactItem}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetails}>
                    {contact.relationship} • {contact.phone}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Edit Button - navigates to Personal Details */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('PersonalInfo')}
        >
          <Edit3 color={darkColors.cyan} size={18} />
          <Text style={styles.editButtonText}>Edit in Personal Details</Text>
        </TouchableOpacity>
      </ScrollView>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: darkColors.bg },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  closeBtn: { padding: 4 },
  closeText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
  title: {
    color: darkColors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },

  // Allergies Banner
  allergiesBanner: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  allergiesText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: darkColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    color: darkColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  // Section Title
  sectionTitle: {
    color: darkColors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Medications List
  medicationsList: {
    marginBottom: 32,
  },
  medicationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  medicationLeft: {
    flex: 1,
  },
  medicationName: {
    color: darkColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationDosage: {
    color: darkColors.textMuted,
    fontSize: 13,
  },
  medicationRight: {
    alignItems: 'flex-end',
  },
  lastTakenLabel: {
    color: darkColors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  lastTakenTime: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty Section
  emptySection: {
    paddingVertical: 24,
    marginBottom: 32,
  },
  emptyText: {
    color: darkColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },

  // Medical History
  historySection: {
    marginBottom: 32,
  },
  historySubtitle: {
    color: darkColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  historyEmpty: {
    color: darkColors.textMuted,
    fontSize: 14,
  },
  historyItem: {
    color: darkColors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },

  // Contacts
  contactsList: {
    marginBottom: 32,
  },
  contactItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  contactName: {
    color: darkColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDetails: {
    color: darkColors.textMuted,
    fontSize: 13,
  },

  // Edit Button
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: darkColors.cyan,
    backgroundColor: darkColors.cyanDim,
    marginTop: 8,
  },
  editButtonText: {
    color: darkColors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
});
