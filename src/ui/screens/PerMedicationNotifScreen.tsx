import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  Pill,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useMedications } from '../hooks/useMedications';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import type { RootStackScreenProps } from '../navigation/types';
import type { Medication, MedicationNotificationOverride } from '../../domain/types';

const ADVANCE_OPTIONS = [
  { label: 'Use global setting', value: null as number | null },
  { label: 'At dose time', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
];

export default function PerMedicationNotifScreen({ navigation }: RootStackScreenProps<'PerMedicationNotif'>) {
  const { colors } = useTheme();
  const { medications, loading: medsLoading } = useMedications();
  const { prefs, loading: prefsLoading, updateMedicationOverride } = useNotificationPrefs();
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [showAdvanceFor, setShowAdvanceFor] = useState<string | null>(null);

  const activeMeds = medications.filter((m) => !m.is_archived);

  const getOverride = useCallback(
    (medId: string): MedicationNotificationOverride | undefined => {
      return prefs?.medication_overrides[medId];
    },
    [prefs],
  );

  const isReminderEnabled = useCallback(
    (med: Medication): boolean => {
      const override = getOverride(med.id);
      return override?.reminders_enabled ?? prefs?.dose_reminders_enabled ?? true;
    },
    [getOverride, prefs],
  );

  const getAdvanceMinutes = useCallback(
    (med: Medication): number | null => {
      const override = getOverride(med.id);
      return override?.advance_minutes ?? null;
    },
    [getOverride],
  );

  const handleToggleReminder = useCallback(
    (med: Medication, enabled: boolean) => {
      const existing = getOverride(med.id);
      updateMedicationOverride(med.id, {
        reminders_enabled: enabled,
        advance_minutes: existing?.advance_minutes ?? null,
      });
    },
    [getOverride, updateMedicationOverride],
  );

  const handleAdvanceChange = useCallback(
    (med: Medication, minutes: number | null) => {
      const existing = getOverride(med.id);
      const enabled = existing?.reminders_enabled ?? prefs?.dose_reminders_enabled ?? true;
      if (minutes === null && (existing?.reminders_enabled === undefined || existing?.reminders_enabled === prefs?.dose_reminders_enabled)) {
        // Both values match global — remove override entirely
        updateMedicationOverride(med.id, null);
      } else {
        updateMedicationOverride(med.id, {
          reminders_enabled: enabled,
          advance_minutes: minutes,
        });
      }
      setShowAdvanceFor(null);
    },
    [getOverride, prefs, updateMedicationOverride],
  );

  const getAdvanceLabel = (med: Medication): string => {
    const minutes = getAdvanceMinutes(med);
    if (minutes === null) return 'Global';
    if (minutes === 0) return 'At dose time';
    return `${minutes}m before`;
  };

  const getScheduleInfo = (med: Medication): string => {
    const times = med.dose_times?.join(', ') || med.time_of_day;
    const freq =
      med.frequency === 'daily'
        ? 'Daily'
        : med.frequency === 'every_other_day'
          ? 'Every other day'
          : med.frequency === 'mon_fri'
            ? 'Mon-Fri'
            : 'Custom';
    return `${freq} at ${times}`;
  };

  if (medsLoading || prefsLoading || !prefs) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Medication Alerts</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Override notification settings</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {activeMeds.length === 0 ? (
          <View style={styles.emptyState}>
            <Pill color={colors.textMuted} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Medications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add a medication to configure individual notification settings
            </Text>
          </View>
        ) : (
          activeMeds.map((med) => {
            const isExpanded = expandedMedId === med.id;
            const enabled = isReminderEnabled(med);

            return (
              <View key={med.id}>
                {/* Medication Row */}
                <TouchableOpacity
                  style={[styles.medCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => setExpandedMedId(isExpanded ? null : med.id)}
                >
                  <View style={[styles.medIcon, { backgroundColor: colors.cyanDim }]}>
                    <Pill color={colors.cyan} size={18} />
                  </View>
                  <View style={styles.medContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {med.name}
                        {med.strength ? ` (${med.strength})` : ''}
                      </Text>
                      {med.is_critical && (
                        <View style={styles.criticalBadge}>
                          <AlertTriangle color="#EF4444" size={10} />
                          <Text style={styles.criticalText}>Critical</Text>
                        </View>
                      )}
                      {med.is_as_needed && (
                        <Text style={[styles.asNeededLabel, { color: colors.textMuted }]}>(As needed)</Text>
                      )}
                    </View>
                    <Text style={[styles.medSchedule, { color: colors.textMuted }]}>{getScheduleInfo(med)}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(v) => handleToggleReminder(med, v)}
                    trackColor={{ false: colors.border, true: colors.cyan }}
                    thumbColor="#fff"
                  />
                </TouchableOpacity>

                {/* Expanded Settings */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {med.is_paused && (
                      <View style={styles.pausedBanner}>
                        <Text style={[styles.pausedText, { color: colors.warning }]}>This medication is paused</Text>
                      </View>
                    )}

                    {/* Advance Reminder Override */}
                    <TouchableOpacity
                      style={[styles.subSettingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                      activeOpacity={0.8}
                      onPress={() =>
                        setShowAdvanceFor(showAdvanceFor === med.id ? null : med.id)
                      }
                    >
                      <View style={styles.subSettingContent}>
                        <Text style={[styles.subSettingTitle, { color: colors.textPrimary }]}>Advance Reminder</Text>
                        <Text style={[styles.subSettingSubtitle, { color: colors.textMuted }]}>Override global timing</Text>
                      </View>
                      <View style={styles.settingValue}>
                        <Text style={[styles.settingValueText, { color: colors.cyan }]}>
                          {getAdvanceLabel(med)}
                        </Text>
                        <ChevronDown color={colors.textMuted} size={16} />
                      </View>
                    </TouchableOpacity>

                    {showAdvanceFor === med.id && (
                      <View style={[styles.pickerDropdown, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                        {ADVANCE_OPTIONS.map((option, idx) => {
                          const currentValue = getAdvanceMinutes(med);
                          const isSelected = option.value === currentValue;
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.pickerOption,
                                { borderBottomColor: colors.border },
                                isSelected && styles.pickerOptionSelected,
                              ]}
                              onPress={() => handleAdvanceChange(med, option.value)}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  { color: colors.textSecondary },
                                  isSelected && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Medication card
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medContent: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  medSchedule: {
    fontSize: 12,
    marginTop: 2,
  },

  // Badges
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criticalText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  asNeededLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Expanded section
  expandedSection: {
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 209, 255, 0.2)',
    paddingLeft: 12,
  },
  pausedBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  pausedText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Sub setting
  subSettingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
  },
  subSettingContent: {
    flex: 1,
  },
  subSettingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  subSettingSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Picker Dropdown
  pickerDropdown: {
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  pickerOptionText: {
    fontSize: 14,
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
  },
});
