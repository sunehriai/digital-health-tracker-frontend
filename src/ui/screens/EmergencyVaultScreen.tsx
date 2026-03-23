// Emergency Vault — always uses dark theme palette from useTheme()
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { X, Edit3 } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useMedications } from '../hooks/useMedications';
import { useTheme } from '../theme/ThemeContext';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useOnboarding } from '../hooks/useOnboarding';
import SpotlightHint from '../components/onboarding/SpotlightHint';
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
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('EmergencyVault');
  const { colors } = useTheme();
  const { checkHint, activateHint, dismissHint, activeHint } = useOnboarding();
  const editBtnRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [editBtnRect, setEditBtnRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Re-fetch vault data when screen regains focus (e.g. after editing in PersonalInfo)
  useFocusEffect(
    useCallback(() => {
      fetchVault();
    }, [fetchVault])
  );

  // H1: hint on "Edit in Personal Details" button — first visit only
  // Wait for data to load, scroll to bottom, then measure
  const h1TriggeredRef = useRef(false);
  // Reset trigger ref when hint flags change (e.g. after onboarding reset)
  React.useEffect(() => { h1TriggeredRef.current = false; }, [checkHint]);
  React.useEffect(() => {
    if (vaultLoading || medsLoading || h1TriggeredRef.current) return;
    if (!checkHint('H1', true)) return;
    h1TriggeredRef.current = true;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        editBtnRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            setEditBtnRect({ x, y, width: w, height: h });
            activateHint('H1');
          }
        });
      }, 500);
    }, 300);
    return () => clearTimeout(t);
  }, [vaultLoading, medsLoading, checkHint, activateHint]);

  const loading = vaultLoading || medsLoading;

  if (vaultLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.authContainer}>
          <ActivityIndicator color={colors.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const computedAge = user?.date_of_birth
    ? Math.floor((Date.now() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const allergiesList = vault?.allergies || [];
  const conditionsList = vault?.conditions || [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>Close</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Emergency Medical Summary</Text>

        {/* Allergies Banner */}
        <View style={[styles.allergiesBanner, { borderColor: colors.warning, backgroundColor: `${colors.warning}14` }]}>
          <Text style={[styles.allergiesText, { color: colors.warning }]}>
            ALLERGIES: {allergiesList.length > 0 ? allergiesList.join(', ').toUpperCase() : 'NONE RECORDED'}
          </Text>
        </View>

        {/* Quick Stats Row */}
        <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>BLOOD</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{vault?.blood_type || '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>WEIGHT</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{vault?.weight ? `${vault.weight}lb` : '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>AGE</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{computedAge ?? '—'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>CONDITION</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{conditionsList.length > 0 ? conditionsList[0] : 'None'}</Text>
          </View>
        </View>

        {/* Active Medications Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>ACTIVE MEDICATIONS</Text>

        {activeMedications.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active medications</Text>
          </View>
        ) : (
          <View style={styles.medicationsList}>
            {activeMedications.map((med) => (
              <View key={med.id} style={[styles.medicationItem, { borderBottomColor: colors.border }]}>
                <View style={styles.medicationLeft}>
                  <Text style={[styles.medicationName, { color: colors.textPrimary }]}>{med.name}</Text>
                  <Text style={[styles.medicationDosage, { color: colors.textMuted }]}>
                    {med.strength || ''}{med.strength ? ', ' : ''}{formatFrequency(med.frequency, med.custom_days)}
                  </Text>
                </View>
                <View style={styles.medicationRight}>
                  <Text style={[styles.lastTakenLabel, { color: colors.textMuted }]}>Scheduled:</Text>
                  <Text style={[styles.lastTakenTime, { color: colors.textPrimary }]}>{formatScheduledTime(med.time_of_day)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Medical History Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>MEDICAL HISTORY</Text>

        <View style={styles.historySection}>
          <Text style={[styles.historySubtitle, { color: colors.textMuted }]}>CHRONIC CONDITIONS</Text>
          {conditionsList.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: colors.textMuted }]}>No conditions recorded</Text>
          ) : (
            conditionsList.map((condition, index) => (
              <Text key={index} style={[styles.historyItem, { color: colors.textPrimary }]}>• {condition}</Text>
            ))
          )}
        </View>

        {/* Emergency Contacts */}
        {vault?.medical_contacts && vault.medical_contacts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.cyan }]}>EMERGENCY CONTACTS</Text>
            <View style={styles.contactsList}>
              {vault.medical_contacts.map((contact, index) => (
                <View key={index} style={[styles.contactItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.contactName, { color: colors.textPrimary }]}>{contact.name}</Text>
                  <Text style={[styles.contactDetails, { color: colors.textMuted }]}>
                    {contact.relationship} • {contact.phone}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Edit Button - navigates to Personal Details */}
        <TouchableOpacity
          ref={editBtnRef as any}
          style={[styles.editButton, { borderColor: colors.cyan, backgroundColor: colors.cyanDim }]}
          onPress={() => navigation.navigate('PersonalInfo')}
        >
          <Edit3 color={colors.cyan} size={18} />
          <Text style={[styles.editButtonText, { color: colors.cyan }]}>Edit in Personal Details</Text>
        </TouchableOpacity>
      </ScrollView>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
      {/* Onboarding hint H1: edit button */}
      {activeHint === 'H1' && editBtnRect && (
        <SpotlightHint
          targetRect={editBtnRect}
          title="Complete Your Snapshot"
          message="Tap here to add your allergies, blood type, and conditions — the more you fill in, the more useful this becomes."
          onDismiss={() => dismissHint('H1')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
    fontSize: 14,
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },

  // Allergies Banner
  allergiesBanner: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  allergiesText: {
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
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Section Title
  sectionTitle: {
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
  },
  medicationLeft: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 13,
  },
  medicationRight: {
    alignItems: 'flex-end',
  },
  lastTakenLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  lastTakenTime: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty Section
  emptySection: {
    paddingVertical: 24,
    marginBottom: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Medical History
  historySection: {
    marginBottom: 32,
  },
  historySubtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
  },
  historyItem: {
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
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDetails: {
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
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
