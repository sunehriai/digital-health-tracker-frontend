import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, Clock, Pencil, Plus, Minus, Trash2 } from 'lucide-react-native';
import { useMedications } from '../hooks/useMedications';
import { useGamification } from '../hooks/useGamification';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';
import TimeInput from '../components/TimeInput';
import DateInput from '../components/DateInput';
import { formatTime12h } from '../../domain/utils';
import { createLogger } from '../../utils/logger';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';

const logger = createLogger('RitualPreview');

interface AlarmTime {
  id: string;
  time: string;
  doseSize: number;
  frequency: string;
  customDays: number[] | null;
  startDate: string;
  endDate: string | null;
}

const DAYS_OF_WEEK_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'specific_days', label: 'Specific Days' },
  { value: 'interval', label: 'Every X Days' },
  { value: 'as_needed', label: 'As Needed' },
];

const DAYS_OF_WEEK = [
  { short: 'Sun', value: 0 },
  { short: 'Mon', value: 1 },
  { short: 'Tue', value: 2 },
  { short: 'Wed', value: 3 },
  { short: 'Thu', value: 4 },
  { short: 'Fri', value: 5 },
  { short: 'Sat', value: 6 },
];

export default function RitualPreviewScreen({ navigation, route }: RootStackScreenProps<'RitualPreview'>) {
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('RitualPreview');
  const {
    name,
    strength,
    frequency,
    customDays,
    startDate,
    endDate,
    isOngoing,
    timeOfDay,
    doseTimes,
    occurrence,
    doseIntervalHours,
    mealRelation,
    doseSize,
    doseUnit,
    initialStock,
    indication,
    specialInstructions,
    allergies,
    doctorName,
    pharmacyName,
    brandName,
    isCritical,
    expiryDate,
    // AI tracking fields (optional)
    entryMode,
    aiConfidenceScore,
    requiresReview,
  } = route.params;

  const { createMedication } = useMedications();
  const { refreshStatus } = useGamification();
  const [saving, setSaving] = useState(false);

  // Alarms state - initialize from doseTimes array (supports multiple doses per day)
  const [alarms, setAlarms] = useState<AlarmTime[]>(() => {
    // Create an alarm for each dose time
    return doseTimes.map((time, index) => ({
      id: String(index + 1),
      time,
      doseSize: doseSize,
      frequency: frequency,
      customDays: customDays,
      startDate: startDate,
      endDate: endDate,
    }));
  });

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmTime | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editDoseSize, setEditDoseSize] = useState(1);
  const [editFrequency, setEditFrequency] = useState('daily');
  const [editSelectedDays, setEditSelectedDays] = useState<number[]>([]);
  const [editIntervalDays, setEditIntervalDays] = useState(2);
  const [editStartDate, setEditStartDate] = useState(startDate);
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [editIsOngoing, setEditIsOngoing] = useState(true);


  // Calculate total daily dose and estimated duration
  const totalDailyDose = alarms.reduce((sum, alarm) => sum + alarm.doseSize, 0);
  const estimatedDuration = totalDailyDose > 0 ? Math.floor(initialStock / totalDailyDose) : 0;

  // Format helpers
  const formatFrequency = (freq: string, days?: number[] | null) => {
    // Check if it's an interval (negative number in customDays)
    if (days && days.length === 1 && days[0] < 0) {
      const interval = Math.abs(days[0]);
      return `Every ${interval} days`;
    }

    // Check if it's specific days
    if (freq === 'custom' && days && days.length > 0) {
      const dayNames = days
        .sort((a, b) => a - b)
        .map((d) => DAYS_OF_WEEK_NAMES[d]);
      return dayNames.join(', ');
    }

    switch (freq) {
      case 'daily': return 'Daily';
      case 'every_other_day': return 'Every other day';
      case 'as_needed': return 'As needed';
      default: return freq;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  // Alarm management
  const openEditModal = (alarm: AlarmTime) => {
    setEditingAlarm(alarm);
    setEditTime(alarm.time);
    setEditDoseSize(alarm.doseSize);
    // Determine frequency type from alarm data
    if (alarm.frequency === 'daily') {
      setEditFrequency('daily');
      setEditSelectedDays([]);
      setEditIntervalDays(2);
    } else if (alarm.frequency === 'as_needed') {
      setEditFrequency('as_needed');
      setEditSelectedDays([]);
      setEditIntervalDays(2);
    } else if (alarm.customDays && alarm.customDays.length === 1 && alarm.customDays[0] < 0) {
      setEditFrequency('interval');
      setEditIntervalDays(Math.abs(alarm.customDays[0]));
      setEditSelectedDays([]);
    } else if (alarm.frequency === 'custom' && alarm.customDays) {
      setEditFrequency('specific_days');
      setEditSelectedDays(alarm.customDays);
      setEditIntervalDays(2);
    } else {
      setEditFrequency('daily');
      setEditSelectedDays([]);
      setEditIntervalDays(2);
    }
    setEditStartDate(alarm.startDate);
    setEditEndDate(alarm.endDate);
    setEditIsOngoing(!alarm.endDate);
    setEditModalVisible(true);
  };

  const openAddModal = () => {
    setEditingAlarm(null);
    setEditTime('12:00');
    setEditDoseSize(1);
    setEditFrequency('daily');
    setEditSelectedDays([]);
    setEditIntervalDays(2);
    setEditStartDate(startDate);
    setEditEndDate(null);
    setEditIsOngoing(true);
    setEditModalVisible(true);
  };

  const saveAlarm = () => {
    // Determine frequency and customDays based on selection
    let alarmFrequency = 'daily';
    let alarmCustomDays: number[] | null = null;

    if (editFrequency === 'daily') {
      alarmFrequency = 'daily';
    } else if (editFrequency === 'specific_days') {
      alarmFrequency = 'custom';
      alarmCustomDays = editSelectedDays.length > 0 ? editSelectedDays : null;
    } else if (editFrequency === 'interval') {
      alarmFrequency = 'every_other_day';
      alarmCustomDays = [-editIntervalDays]; // Negative number indicates interval
    } else if (editFrequency === 'as_needed') {
      alarmFrequency = 'as_needed';
    }

    if (editingAlarm) {
      // Update existing alarm
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === editingAlarm.id
            ? {
                ...a,
                time: editTime,
                doseSize: editDoseSize,
                frequency: alarmFrequency,
                customDays: alarmCustomDays,
                startDate: editStartDate,
                endDate: editIsOngoing ? null : editEndDate,
              }
            : a
        )
      );
    } else {
      // Add new alarm
      const newAlarm: AlarmTime = {
        id: Date.now().toString(),
        time: editTime,
        doseSize: editDoseSize,
        frequency: alarmFrequency,
        customDays: alarmCustomDays,
        startDate: editStartDate,
        endDate: editIsOngoing ? null : editEndDate,
      };
      setAlarms((prev) => [...prev, newAlarm]);
    }
    setEditModalVisible(false);
  };

  const removeAlarm = (id: string) => {
    if (alarms.length <= 1) {
      Alert.alert('Cannot Remove', 'You need at least one alarm time.');
      return;
    }
    Alert.alert('Remove Alarm', 'Are you sure you want to remove this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setAlarms((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  const updateAlarmDose = (id: string, delta: number) => {
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, doseSize: Math.max(1, a.doseSize + delta) } : a
      )
    );
  };

  // Save medication and start streak
  const handleStartStreak = async () => {
    logger.info('Starting medication save', { name, entryMode });
    setSaving(true);
    try {
      // Use the first alarm's time as the main time_of_day
      const primaryAlarm = alarms[0];

      // Build dose_times array from all alarms
      const allDoseTimes = alarms.map(a => a.time);

      // Determine occurrence based on number of alarms
      const alarmCount = alarms.length;
      const calculatedOccurrence = alarmCount === 1 ? 'once' : alarmCount === 2 ? 'twice' : 'thrice';

      const medicationData = {
        name,
        strength,
        frequency: primaryAlarm.frequency as 'daily' | 'every_other_day' | 'mon_fri' | 'custom',
        custom_days: primaryAlarm.customDays,
        start_date: primaryAlarm.startDate,
        end_date: primaryAlarm.endDate,
        is_ongoing: !primaryAlarm.endDate,
        time_of_day: primaryAlarm.time,
        dose_times: allDoseTimes,
        occurrence: calculatedOccurrence as 'once' | 'twice' | 'thrice',
        dose_interval_hours: doseIntervalHours,
        meal_relation: mealRelation as 'none' | 'before' | 'with' | 'after',
        dose_size: totalDailyDose,
        dose_unit: doseUnit,
        initial_stock: initialStock,
        current_stock: initialStock,
        indication,
        special_instructions: specialInstructions,
        allergies,
        doctor_name: doctorName,
        pharmacy_name: pharmacyName,
        brand_name: brandName,
        is_critical: isCritical,
        expiry_date: expiryDate,
        // AI tracking fields
        entry_mode: entryMode || 'manual',
        ai_confidence_score: aiConfidenceScore ?? null,
        requires_review: requiresReview ?? false,
      };

      logger.debug('Medication data prepared', {
        name: medicationData.name,
        frequency: medicationData.frequency,
        occurrence: calculatedOccurrence,
        isCritical: medicationData.is_critical,
        entryMode: medicationData.entry_mode,
      });

      const result = await createMedication(medicationData);
      await refreshStatus();

      logger.info('Medication created successfully', { name });

      // Show insight from Gemini if available, otherwise generic message
      const insightText = result.insight?.insight_text;
      const message = insightText
        ? `${name} added!\n\n${insightText}`
        : `${name} has been added to your cabinet. Your vitality streak starts now!`;

      if (Platform.OS === 'web') {
        window.alert(`Ritual Initialized!\n\n${message}`);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        Alert.alert(
          'Ritual Initialized!',
          message,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              },
            },
          ]
        );
      }
    } catch (e: any) {
      logger.error('Failed to create medication', e, { name });
      const errorMsg = e?.message || 'Failed to save medication. Please check if the backend is running.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.cyan} size={24} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Ritual Preview</Text>
            <Text style={styles.medicationName}>{name}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Medication Info */}
        {(strength || indication) && (
          <View style={styles.metaRow}>
            {strength && <Text style={styles.strengthText}>{strength}</Text>}
            {indication && <Text style={styles.indicationText}>{indication}</Text>}
          </View>
        )}

        {/* DAILY SCHEDULE */}
        <Text style={styles.sectionLabel}>DAILY SCHEDULE</Text>

        {alarms.map((alarm) => (
          <View key={alarm.id} style={styles.scheduleCard}>
            <View style={styles.scheduleRow}>
              <View style={styles.clockIcon}>
                <Clock color={colors.cyan} size={20} strokeWidth={2} />
              </View>
              <View style={styles.scheduleInfo}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime12h(alarm.time)}</Text>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(alarm)}>
                    <Pencil color={colors.cyan} size={14} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.frequencyContext}>{formatFrequency(alarm.frequency, alarm.customDays)}</Text>
                <Text style={styles.dateContext}>
                  {formatDate(alarm.startDate)}{alarm.endDate ? ` - ${formatDate(alarm.endDate)}` : ' - Ongoing'}
                </Text>
              </View>
              <View style={styles.alarmActions}>
                <View style={styles.doseStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => updateAlarmDose(alarm.id, -1)}
                  >
                    <Minus color="#64748B" size={14} strokeWidth={3} />
                  </TouchableOpacity>
                  <Text style={styles.doseValue}>{alarm.doseSize}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => updateAlarmDose(alarm.id, 1)}
                  >
                    <Plus color="#64748B" size={14} strokeWidth={3} />
                  </TouchableOpacity>
                </View>
                {alarms.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeAlarm(alarm.id)}
                  >
                    <Trash2 color="#FB7185" size={16} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Add Another Time */}
        <TouchableOpacity style={styles.addTimeBtn} onPress={openAddModal}>
          <Plus color={colors.cyan} size={18} strokeWidth={2} />
          <Text style={styles.addTimeText}>Add Another Time</Text>
        </TouchableOpacity>

        {/* Info text */}
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoText}>Alarms auto-spaced for maximum absorption.</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Initial Stock</Text>
            <Text style={styles.statValue}>{initialStock} <Text style={styles.statUnit}>{doseUnit}</Text></Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Daily Dose</Text>
            <Text style={styles.statValue}>{totalDailyDose} <Text style={styles.statUnit}>{doseUnit}</Text></Text>
          </View>
          <View style={[styles.statRow, styles.statRowLast]}>
            <Text style={styles.statLabelBold}>Estimated Duration</Text>
            <Text style={styles.statValue}>{estimatedDuration} <Text style={styles.statUnit}>days</Text></Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.startBtn, saving && styles.startBtnDisabled]}
          onPress={handleStartStreak}
          disabled={saving}
        >
          {saving ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.startBtnText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.startBtnText}>START VITALITY STREAK</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit/Add Alarm Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAlarm ? 'Edit Alarm' : 'Add Alarm'}
                </Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              {/* Start Date */}
              <DateInput
                value={editStartDate}
                onChange={setEditStartDate}
                label="Start Date"
              />

              {/* End Date Toggle */}
              <View style={styles.endDateToggle}>
                <Text style={styles.modalLabel}>End Date</Text>
                <TouchableOpacity
                  style={[styles.ongoingToggle, editIsOngoing && styles.ongoingToggleActive]}
                  onPress={() => setEditIsOngoing(!editIsOngoing)}
                >
                  <Text style={[styles.ongoingToggleText, editIsOngoing && styles.ongoingToggleTextActive]}>
                    Ongoing
                  </Text>
                </TouchableOpacity>
              </View>

              {!editIsOngoing && (
                <View style={{ marginTop: 8 }}>
                  <DateInput
                    value={editEndDate || ''}
                    onChange={(date) => setEditEndDate(date)}
                    placeholder="Select end date"
                  />
                </View>
              )}

              {/* Time Input */}
              <TimeInput
                value={editTime}
                onChange={setEditTime}
                label="Time"
              />

              {/* Frequency */}
              <Text style={styles.modalLabel}>Frequency</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      editFrequency === option.value && styles.frequencyOptionActive,
                    ]}
                    onPress={() => setEditFrequency(option.value)}
                  >
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        editFrequency === option.value && styles.frequencyOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day selector for specific days */}
              {editFrequency === 'specific_days' && (
                <View style={styles.daySelector}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayBtn,
                        editSelectedDays.includes(day.value) && styles.dayBtnActive,
                      ]}
                      onPress={() => {
                        if (editSelectedDays.includes(day.value)) {
                          setEditSelectedDays(editSelectedDays.filter((d) => d !== day.value));
                        } else {
                          setEditSelectedDays([...editSelectedDays, day.value]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.dayBtnText,
                          editSelectedDays.includes(day.value) && styles.dayBtnTextActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Interval selector */}
              {editFrequency === 'interval' && (
                <View style={styles.intervalSelector}>
                  <Text style={styles.intervalLabel}>Every</Text>
                  <View style={styles.intervalStepper}>
                    <TouchableOpacity
                      style={styles.intervalBtn}
                      onPress={() => setEditIntervalDays(Math.max(2, editIntervalDays - 1))}
                    >
                      <Minus color={colors.cyan} size={16} />
                    </TouchableOpacity>
                    <Text style={styles.intervalValue}>{editIntervalDays}</Text>
                    <TouchableOpacity
                      style={styles.intervalBtn}
                      onPress={() => setEditIntervalDays(editIntervalDays + 1)}
                    >
                      <Plus color={colors.cyan} size={16} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.intervalLabel}>days</Text>
                </View>
              )}

              {/* Dose Size */}
              <Text style={styles.modalLabel}>Dose Size</Text>
              <View style={styles.modalStepperContainer}>
                <TouchableOpacity
                  style={styles.modalStepperBtn}
                  onPress={() => setEditDoseSize(Math.max(1, editDoseSize - 1))}
                >
                  <Minus color={colors.cyan} size={18} strokeWidth={3} />
                </TouchableOpacity>
                <Text style={styles.modalStepperValue}>{editDoseSize}</Text>
                <TouchableOpacity
                  style={styles.modalStepperBtn}
                  onPress={() => setEditDoseSize(editDoseSize + 1)}
                >
                  <Plus color={colors.cyan} size={18} strokeWidth={3} />
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAlarm}>
                <Text style={styles.modalSaveBtnText}>
                  {editingAlarm ? 'Save Changes' : 'Add Alarm'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0B' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  strengthText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  indicationText: {
    color: '#94A3B8',
    fontSize: 14,
  },

  // Section label
  sectionLabel: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Schedule card
  scheduleCard: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  editBtn: {
    padding: 4,
  },
  frequencyContext: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  dateContext: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doseStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 4,
  },

  // Add time button
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  addTimeText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 13,
  },

  // Stats card
  statsCard: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statLabelBold: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '700',
  },
  statUnit: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '500',
  },

  // Bottom container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  startBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    color: '#0A0A0B',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#0A0A0B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  // Date/Time picker button
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  datePickerText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },

  // Frequency grid
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  frequencyOptionActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderColor: colors.cyan,
  },
  frequencyOptionText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  frequencyOptionTextActive: {
    color: colors.cyan,
  },

  // Day selector
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.2)',
    borderColor: colors.cyan,
  },
  dayBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  dayBtnTextActive: {
    color: colors.cyan,
  },

  // Interval selector
  intervalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 8,
  },
  intervalLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  intervalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },

  // End date toggle
  endDateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  ongoingToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ongoingToggleActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderColor: colors.cyan,
  },
  ongoingToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  ongoingToggleTextActive: {
    color: colors.cyan,
  },
  modalStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
  },
  modalStepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStepperValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  modalSaveBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveBtnText: {
    color: '#0A0A0B',
    fontSize: 15,
    fontWeight: '700',
  },
});
