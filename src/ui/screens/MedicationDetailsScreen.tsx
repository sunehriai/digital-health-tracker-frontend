import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Pencil, Trash2, Plus, Sun, Moon, CloudMoon, ChevronDown, ChevronUp, AlertTriangle, Pause, Play, Archive, Package, AlertCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { medicationService } from '../../data/services/medicationService';
import { feedService } from '../../data/services/feedService';
import TimeInput from '../components/TimeInput';
import DateInput from '../components/DateInput';
import type { Medication, MedicationUpdate } from '../../domain/types';
import type { RootStackScreenProps } from '../navigation/types';
import { getDoseTimes } from '../../domain/utils';
import {
  ALARM_FREQUENCY_OPTIONS,
  DAYS_OF_WEEK,
  DAYS_OF_WEEK_NAMES,
  MEAL_OPTIONS,
  DOSE_UNITS,
  INVENTORY_CONFIG,
  STOCK_THRESHOLDS,
  VALIDATION,
  calculateStockPercentage,
  getProgressBarColor,
  toBackendFrequency,
  formatFrequencyDisplay,
  formatMealRelation,
  type MealRelationType,
  type DoseUnitType,
} from '../../domain/medicationConfig';

// Type alias for UI frequency (excludes 'as_needed' since as-needed meds don't have alarms)
type FrequencyType = 'daily' | 'every_other_day' | 'mon_fri' | 'custom';

interface AlarmTime {
  id: string;
  time: string;
  period: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  frequency: string;
}

const getPeriodFromTime = (time: string): 'Morning' | 'Afternoon' | 'Evening' | 'Night' => {
  const [hours] = time.split(':').map(Number);
  if (hours >= 5 && hours < 12) return 'Morning';
  if (hours >= 12 && hours < 17) return 'Afternoon';
  if (hours >= 17 && hours < 21) return 'Evening';
  return 'Night';
};

const getPeriodIcon = (period: string) => {
  switch (period) {
    case 'Morning':
      return <Sun color="#FBBF24" size={16} />;  // Yellow sun for morning (sunrise)
    case 'Afternoon':
      return <Sun color="#F97316" size={16} />;  // Orange sun for afternoon (peak heat)
    case 'Evening':
      return <CloudMoon color="#8B5CF6" size={16} />;  // Purple moon with cloud for evening (dusk)
    case 'Night':
      return <Moon color="#6366F1" size={16} />;  // Indigo moon for night
    default:
      return <Sun color="#FBBF24" size={16} />;
  }
};

const formatTime12Hour = (time: string): { time: string; period: string } => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return {
    time: `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    period,
  };
};


export default function MedicationDetailsScreen({
  navigation,
  route,
}: RootStackScreenProps<'MedicationDetails'>) {
  const { medicationId, isArchived = false, alertId } = route.params;
  const [medication, setMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alarms, setAlarms] = useState<AlarmTime[]>([]);

  // Alarm modal state
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmTime | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editFrequency, setEditFrequency] = useState<FrequencyType>('daily');
  const [editSelectedDays, setEditSelectedDays] = useState<number[]>([]);
  const [editIntervalDays, setEditIntervalDays] = useState(2);

  // Edit medication modal state
  const [editMedModalVisible, setEditMedModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStrength, setEditStrength] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Additional fields for expanded edit
  const [editIndication, setEditIndication] = useState('');
  const [editSpecialInstructions, setEditSpecialInstructions] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editPharmacyName, setEditPharmacyName] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [editDoseSize, setEditDoseSize] = useState(1);
  const [editMealRelation, setEditMealRelation] = useState<MealRelationType>('none');
  const [editIsCritical, setEditIsCritical] = useState(false);

  // New fields for dose unit and expiry
  const [editDoseUnit, setEditDoseUnit] = useState<'tablets' | 'capsules' | 'mL' | 'tsp'>('tablets');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  // Dose picker modal state
  const [showDosePicker, setShowDosePicker] = useState(false);
  const [doseInputText, setDoseInputText] = useState('');

  // Expandable sections
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editDetailsExpanded, setEditDetailsExpanded] = useState(false);

  // Refill modal state
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);

  useEffect(() => {
    loadMedication();
  }, [medicationId]);

  const loadMedication = async () => {
    try {
      const med = await medicationService.getById(medicationId);
      setMedication(med);
      // Initialize alarms from dose_times array (for multi-dose) or time_of_day
      // Skip for as-needed medications - they don't have scheduled alarms
      if (!med.is_as_needed) {
        const doseTimes = getDoseTimes(med);
        if (doseTimes.length > 0) {
          setAlarms(
            doseTimes.map((time, index) => ({
              id: String(index + 1),
              time,
              period: getPeriodFromTime(time),
              frequency: med.frequency || 'daily',
            }))
          );
        }
      } else {
        // Clear alarms for as-needed medications
        setAlarms([]);
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to load medication';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Alarm functions
  const openAlarmModal = (alarm: AlarmTime) => {
    setEditingAlarm(alarm);
    setEditTime(alarm.time);
    setEditFrequency(alarm.frequency as FrequencyType);
    // Set selected days and interval from medication's custom_days
    if (medication?.custom_days) {
      if (medication.custom_days.length === 1 && medication.custom_days[0] < 0) {
        // It's an interval
        setEditIntervalDays(Math.abs(medication.custom_days[0]));
        setEditSelectedDays([]);
      } else {
        // It's specific days
        setEditSelectedDays(medication.custom_days);
        setEditIntervalDays(2);
      }
    } else {
      setEditSelectedDays([]);
      setEditIntervalDays(2);
    }
    setAlarmModalVisible(true);
  };

  const openAddAlarmModal = () => {
    setEditingAlarm(null);
    setEditTime('12:00');
    setEditFrequency(medication?.frequency || 'daily');
    // Set selected days and interval from medication's custom_days
    if (medication?.custom_days) {
      if (medication.custom_days.length === 1 && medication.custom_days[0] < 0) {
        setEditIntervalDays(Math.abs(medication.custom_days[0]));
        setEditSelectedDays([]);
      } else {
        setEditSelectedDays(medication.custom_days);
        setEditIntervalDays(2);
      }
    } else {
      setEditSelectedDays([]);
      setEditIntervalDays(2);
    }
    setAlarmModalVisible(true);
  };

  const saveAlarm = async () => {
    // Calculate updated alarms array
    let updatedAlarms: AlarmTime[];
    if (editingAlarm) {
      updatedAlarms = alarms.map((a) =>
        a.id === editingAlarm.id
          ? { ...a, time: editTime, period: getPeriodFromTime(editTime), frequency: editFrequency }
          : a
      );
    } else {
      const newAlarm: AlarmTime = {
        id: Date.now().toString(),
        time: editTime,
        period: getPeriodFromTime(editTime),
        frequency: editFrequency,
      };
      updatedAlarms = [...alarms, newAlarm];
    }

    // Update local state
    setAlarms(updatedAlarms);

    // Always save time and frequency changes to the backend
    // This ensures edits are persisted and HomeScreen reflects the changes
    if (medication) {
      try {
        const backendFreq = toBackendFrequency(editFrequency);

        // Build custom_days based on frequency type
        let customDays: number[] | null = null;
        if (editFrequency === 'custom' && editSelectedDays.length > 0) {
          customDays = editSelectedDays;
        } else if (editFrequency === 'every_other_day') {
          customDays = [-editIntervalDays]; // Negative number represents interval
        }

        // Build dose_times array from all alarms
        const doseTimes = updatedAlarms.map((a) => a.time).sort();

        // Determine occurrence based on number of dose times
        const occurrence: 'once' | 'twice' | 'thrice' =
          doseTimes.length === 3 ? 'thrice' :
          doseTimes.length === 2 ? 'twice' : 'once';

        // If medication was as-needed, convert it to scheduled
        const wasAsNeeded = medication.is_as_needed;

        await medicationService.update(medicationId, {
          time_of_day: doseTimes[0], // Primary/first dose time
          dose_times: doseTimes.length > 1 ? doseTimes : null, // Only set if multi-dose
          occurrence,
          frequency: backendFreq,
          custom_days: customDays,
          is_as_needed: false, // Adding a schedule converts from as-needed to scheduled
        });
        setMedication({
          ...medication,
          time_of_day: doseTimes[0],
          dose_times: doseTimes.length > 1 ? doseTimes : null,
          occurrence,
          frequency: backendFreq,
          custom_days: customDays,
          is_as_needed: false,
        });
      } catch (e) {
        console.error('Failed to update medication:', e);
        const errorMsg = 'Failed to save alarm changes';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    }

    setAlarmModalVisible(false);
  };

  const removeAlarm = async (id: string) => {
    if (alarms.length <= 1) {
      const msg = 'You need at least one alarm time.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Cannot Remove', msg);
      }
      return;
    }

    const doRemove = async () => {
      const updatedAlarms = alarms.filter((a) => a.id !== id);
      setAlarms(updatedAlarms);

      // Save updated dose times to backend
      if (medication) {
        try {
          const doseTimes = updatedAlarms.map((a) => a.time).sort();
          const occurrence: 'once' | 'twice' | 'thrice' =
            doseTimes.length === 3 ? 'thrice' :
            doseTimes.length === 2 ? 'twice' : 'once';

          await medicationService.update(medicationId, {
            time_of_day: doseTimes[0],
            dose_times: doseTimes.length > 1 ? doseTimes : null,
            occurrence,
          });
          setMedication({
            ...medication,
            time_of_day: doseTimes[0],
            dose_times: doseTimes.length > 1 ? doseTimes : null,
            occurrence,
          });
        } catch (e) {
          console.error('Failed to update medication after removing alarm:', e);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this alarm?')) {
        doRemove();
      }
    } else {
      Alert.alert('Remove Alarm', 'Are you sure you want to remove this alarm?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  // Edit medication functions
  const openEditMedModal = () => {
    if (medication) {
      setEditName(medication.name);
      setEditStrength(medication.strength || '');
      setEditStock(medication.current_stock.toString());
      setEditEndDate(medication.end_date || '');
      // Additional fields
      setEditIndication(medication.indication || '');
      setEditSpecialInstructions(medication.special_instructions || '');
      setEditAllergies(medication.allergies || '');
      setEditDoctorName(medication.doctor_name || '');
      setEditPharmacyName(medication.pharmacy_name || '');
      setEditBrandName(medication.brand_name || '');
      setEditDoseSize(medication.dose_size || 1);
      setEditMealRelation(medication.meal_relation || 'none');
      setEditIsCritical(medication.is_critical || false);
      // New fields
      setEditDoseUnit(medication.dose_unit || 'tablets');
      setEditExpiryDate(medication.expiry_date || '');
      setEditDetailsExpanded(false);
      setEditMedModalVisible(true);
    }
  };

  // Validate and set end date
  const handleEditEndDateChange = (date: string) => {
    if (date && medication?.start_date) {
      const start = new Date(medication.start_date);
      const end = new Date(date);
      if (end <= start) {
        const msg = VALIDATION.endDate.errorMessage;
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Invalid Date', msg);
        }
        return;
      }
    }
    setEditEndDate(date);
  };

  const saveMedication = async () => {
    if (!medication) return;

    // Validate end date if provided
    if (editEndDate && medication.start_date) {
      const start = new Date(medication.start_date);
      const end = new Date(editEndDate);
      if (end <= start) {
        const msg = VALIDATION.endDate.errorMessage;
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Invalid Date', msg);
        }
        return;
      }
    }

    setSaving(true);
    try {
      const parsedStock = parseInt(editStock, 10);
      const newStock = isNaN(parsedStock) ? medication.current_stock : parsedStock;
      const previousStock = medication.current_stock;
      const updates: MedicationUpdate = {
        name: editName,
        strength: editStrength || null,
        current_stock: newStock,
        end_date: editEndDate || null,
        is_ongoing: !editEndDate,
        // Additional fields
        indication: editIndication || null,
        special_instructions: editSpecialInstructions || null,
        allergies: editAllergies || null,
        doctor_name: editDoctorName || null,
        pharmacy_name: editPharmacyName || null,
        brand_name: editBrandName || null,
        dose_size: editDoseSize,
        meal_relation: editMealRelation,
        is_critical: editIsCritical,
        // New fields
        dose_unit: editDoseUnit,
        expiry_date: editExpiryDate || null,
      };

      // If new stock exceeds initial stock (refill scenario), update initial_stock too
      if (newStock > medication.initial_stock) {
        updates.initial_stock = newStock;
      }

      const updated = await medicationService.update(medicationId, updates);
      setMedication(updated);
      setEditMedModalVisible(false);

      // If stock increased (refill) and we have an alertId, archive the alert
      if (newStock > previousStock && alertId) {
        try {
          await feedService.archive(alertId);
        } catch (archiveError) {
          console.error('Failed to archive refill alert:', archiveError);
        }
      }

      // Create past activity item for the update
      const stockDiff = newStock - previousStock;
      if (stockDiff !== 0) {
        try {
          await feedService.create({
            type: 'intake',
            priority: 'normal',
            title: stockDiff > 0
              ? `${editName} refilled`
              : `${editName} inventory updated`,
            subtitle: stockDiff > 0
              ? `Added ${stockDiff} doses (now ${newStock} total)`
              : `Stock adjusted to ${newStock} doses`,
            medication_id: medicationId,
          });
        } catch (activityError) {
          console.error('Failed to create activity log:', activityError);
        }
      }

      // Create low stock alert if quantity is below 10
      if (newStock < STOCK_THRESHOLDS.low) {
        try {
          await feedService.create({
            type: 'refill_alert',
            priority: 'high',
            title: 'Low Stock Alert',
            subtitle: `${editName} has only ${newStock} doses remaining. Time to refill!`,
            medication_id: medicationId,
          });
        } catch (feedError) {
          console.error('Failed to create low stock alert:', feedError);
        }
      }

      const successMsg = newStock < 10
        ? `Medication updated. Low stock alert created (${newStock} doses remaining).`
        : 'Medication updated successfully';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to update medication';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Action handlers for Pause/Resume/Archive
  const handlePause = async () => {
    if (!medication || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await medicationService.pause(medicationId);
      setMedication(updated);
      const msg = `${medication.name} paused`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to pause medication';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!medication || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await medicationService.resume(medicationId);
      setMedication(updated);
      const msg = `${medication.name} resumed`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to resume medication';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!medication || actionLoading) return;

    const confirmArchive = () => {
      setActionLoading(true);
      medicationService.archive(medicationId)
        .then(() => {
          const msg = `${medication.name} archived`;
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            Alert.alert('Success', msg);
          }
          navigation.goBack();
        })
        .catch((e: any) => {
          const errorMsg = e?.message || 'Failed to archive medication';
          if (Platform.OS === 'web') {
            window.alert(`Error: ${errorMsg}`);
          } else {
            Alert.alert('Error', errorMsg);
          }
        })
        .finally(() => {
          setActionLoading(false);
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Archive ${medication.name}? It will be moved to History.`)) {
        confirmArchive();
      }
    } else {
      Alert.alert(
        'Archive Medication',
        `Archive ${medication.name}? It will be moved to History.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Archive', style: 'destructive', onPress: confirmArchive },
        ]
      );
    }
  };

  // Refill handlers
  const openRefillModal = () => {
    setRefillAmount('');
    setRefillModalVisible(true);
  };

  const handleQuickRefill = (amount: number) => {
    setRefillAmount(amount.toString());
  };

  const handleConfirmRefill = async () => {
    if (!medication) return;

    const amount = parseInt(refillAmount, 10);
    if (!amount || amount <= 0) {
      const msg = 'Please enter a valid refill amount';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Invalid Amount', msg);
      }
      return;
    }

    setRefillLoading(true);
    try {
      const refillLog = await medicationService.refill(medicationId, amount);

      // Update local medication state with new stock
      // Apply high-water mark: if new stock exceeds initial_stock, update initial_stock too
      const newStock = refillLog.new_stock || medication.current_stock + amount;
      setMedication({
        ...medication,
        current_stock: newStock,
        initial_stock: Math.max(medication.initial_stock, newStock),
      });

      // Create activity log
      try {
        await feedService.create({
          type: 'intake',
          priority: 'normal',
          title: `${medication.name} refilled`,
          subtitle: `Added ${amount} doses (now ${refillLog.new_stock} total)`,
          medication_id: medicationId,
        });
      } catch (feedError) {
        console.error('Failed to create activity log:', feedError);
      }

      // Archive any existing refill alerts for this medication
      if (alertId) {
        try {
          await feedService.archive(alertId);
        } catch (archiveError) {
          console.error('Failed to archive refill alert:', archiveError);
        }
      }

      setRefillModalVisible(false);
      const successMsg = `Added ${amount} doses. New total: ${refillLog.new_stock}`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Refill Logged', successMsg);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to log refill';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setRefillLoading(false);
    }
  };

  if (loading || !medication) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stockPct = calculateStockPercentage(medication.current_stock, medication.initial_stock);
  const progressBarColor = getProgressBarColor(stockPct);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isArchived ? 'Archived Ritual' : 'Ritual Management'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Medication Card */}
        <View style={[styles.medicationCard, isArchived && styles.archivedCard]}>
          <View style={styles.medCardHeader}>
            <View style={styles.medCardInfo}>
              <View style={styles.medNameRow}>
                <Text style={styles.medName}>{medication.name}</Text>
                {medication.is_critical && (
                  <View style={styles.criticalBadge}>
                    <AlertTriangle color="#FB7185" size={14} strokeWidth={3} />
                    <Text style={styles.criticalText}>Critical</Text>
                  </View>
                )}
              </View>
              {medication.strength && (
                <Text style={styles.medStrength}>{medication.strength}</Text>
              )}
            </View>
            {!isArchived && (
              <TouchableOpacity style={styles.editMedBtn} onPress={openEditMedModal}>
                <Pencil color={colors.cyan} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar and inventory */}
          <View style={styles.inventorySection}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.inventoryLabel}>CURRENT INVENTORY</Text>
              <Text style={[styles.inventoryValue, { color: progressBarColor }]}>
                {INVENTORY_CONFIG.formatStockDisplay(medication.current_stock, medication.initial_stock, medication.dose_unit)}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(stockPct, 100)}%`,
                      backgroundColor: progressBarColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: progressBarColor }]}>
                {Math.round(stockPct)}%
              </Text>
            </View>
          </View>

          {/* End Date Display */}
          {medication.end_date && (
            <View style={styles.endDateDisplay}>
              <Text style={styles.endDateLabel}>ENDS ON</Text>
              <Text style={styles.endDateValue}>
                {new Date(medication.end_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* Expandable Medical Context Section */}
          <TouchableOpacity
            style={styles.expandHeader}
            onPress={() => setDetailsExpanded(!detailsExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandHeaderText}>Medical Details</Text>
            {detailsExpanded ? (
              <ChevronUp color={colors.textSecondary} size={20} />
            ) : (
              <ChevronDown color={colors.textSecondary} size={20} />
            )}
          </TouchableOpacity>

          {detailsExpanded && (
            <View style={styles.expandedContent}>
              {/* Dosage Info */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DOSE</Text>
                <Text style={styles.detailValue}>
                  {medication.dose_size || 1} {medication.dose_unit || 'tablet'}(s)
                </Text>
              </View>

              {/* Expiry Date */}
              {medication.expiry_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>EXPIRY DATE</Text>
                  <View style={styles.expiryValueRow}>
                    <Text style={[
                      styles.detailValue,
                      new Date(medication.expiry_date) < new Date() && { color: '#EF4444' },
                      new Date(medication.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                      new Date(medication.expiry_date) >= new Date() && { color: '#F59E0B' },
                    ]}>
                      {new Date(medication.expiry_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    {new Date(medication.expiry_date) < new Date() && (
                      <View style={styles.expiryWarningBadge}>
                        <AlertCircle color="#EF4444" size={12} />
                        <Text style={styles.expiryWarningText}>Expired</Text>
                      </View>
                    )}
                    {new Date(medication.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                     new Date(medication.expiry_date) >= new Date() && (
                      <View style={[styles.expiryWarningBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <AlertCircle color="#F59E0B" size={12} />
                        <Text style={[styles.expiryWarningText, { color: '#F59E0B' }]}>Expiring soon</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>MEAL RELATION</Text>
                <Text style={styles.detailValue}>
                  {formatMealRelation(medication.meal_relation)}
                </Text>
              </View>

              {/* Indication */}
              {medication.indication && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>INDICATION</Text>
                  <Text style={styles.detailValue}>{medication.indication}</Text>
                </View>
              )}

              {/* Special Instructions */}
              {medication.special_instructions && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SPECIAL INSTRUCTIONS</Text>
                  <Text style={styles.detailValue}>{medication.special_instructions}</Text>
                </View>
              )}

              {/* Allergies */}
              {medication.allergies && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ALLERGIES</Text>
                  <Text style={[styles.detailValue, { color: '#FB7185' }]}>{medication.allergies}</Text>
                </View>
              )}

              {/* Brand Name */}
              {medication.brand_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>BRAND NAME</Text>
                  <Text style={styles.detailValue}>{medication.brand_name}</Text>
                </View>
              )}

              {/* Doctor */}
              {medication.doctor_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PRESCRIBING DOCTOR</Text>
                  <Text style={styles.detailValue}>{medication.doctor_name}</Text>
                </View>
              )}

              {/* Pharmacy */}
              {medication.pharmacy_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PHARMACY</Text>
                  <Text style={styles.detailValue}>{medication.pharmacy_name}</Text>
                </View>
              )}

              {/* Start Date */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>STARTED ON</Text>
                <Text style={styles.detailValue}>
                  {new Date(medication.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Daily Schedule - show "Take as needed" for as-needed meds, otherwise show alarms */}
        {medication.is_as_needed ? (
          <>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.asNeededScheduleContainer}>
              <Text style={styles.asNeededScheduleText}>Take as needed</Text>
              <Text style={styles.asNeededScheduleHint}>
                No scheduled reminders — log doses when you take them
              </Text>
            </View>
            {/* Option to add a schedule (converts from as-needed to scheduled) */}
            {!isArchived && (
              <TouchableOpacity style={styles.addAlarmBtn} onPress={openAddAlarmModal}>
                <Plus color={colors.cyan} size={18} />
                <Text style={styles.addAlarmText}>Add Schedule</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Daily Schedule</Text>

            <View style={styles.scheduleContainer}>
              {alarms.map((alarm, index) => {
                const { time: formattedTime, period: ampm } = formatTime12Hour(alarm.time);
                return (
                  <View key={alarm.id}>
                    {/* Timeline connector */}
                    {index > 0 && <View style={styles.timelineConnector} />}

                    <View style={styles.alarmRow}>
                      {/* Timeline dot */}
                      <View style={styles.timelineDot}>
                        <View style={styles.timelineDotInner} />
                      </View>

                      {/* Time display */}
                      <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>{formattedTime}</Text>
                        <Text style={styles.ampmText}>{ampm}</Text>
                      </View>

                      {/* Period icon */}
                      <View style={styles.periodIcon}>
                        {getPeriodIcon(alarm.period)}
                      </View>

                      {/* Frequency badge */}
                      <View style={styles.frequencyBadge}>
                        <Text style={styles.frequencyText}>{formatFrequencyDisplay(alarm.frequency, medication?.custom_days)}</Text>
                      </View>

                      {/* Edit and Delete buttons - only show if not archived */}
                      {!isArchived && (
                        <>
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => openAlarmModal(alarm)}
                          >
                            <Pencil color={colors.textSecondary} size={14} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => removeAlarm(alarm.id)}
                          >
                            <Trash2 color="#FB7185" size={18} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Add New Alarm Button - only show if not archived and not as-needed */}
            {!isArchived && (
              <TouchableOpacity style={styles.addAlarmBtn} onPress={openAddAlarmModal}>
                <Plus color={colors.cyan} size={18} />
                <Text style={styles.addAlarmText}>Add New Alarm</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Log Refill Button - prominent action */}
        {!isArchived && (
          <TouchableOpacity
            style={styles.refillBtn}
            onPress={openRefillModal}
            activeOpacity={0.8}
          >
            <Package color={colors.cyan} size={18} />
            <Text style={styles.refillBtnText}>Log Refill</Text>
            <Text style={styles.refillBtnStock}>{medication.current_stock} {medication.dose_unit || 'doses'} in stock</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons - Pause/Resume/Archive - small ghost buttons at bottom */}
        {!isArchived && (
          <View style={styles.actionButtonsContainer}>
            {/* Paused status indicator */}
            {medication.is_paused && (
              <View style={styles.pausedIndicator}>
                <Pause color="#F59E0B" size={14} />
                <Text style={styles.pausedIndicatorText}>
                  This medication is currently paused
                </Text>
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              {/* Pause or Resume button based on current state */}
              {medication.is_paused ? (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={handleResume}
                  disabled={actionLoading}
                >
                  <Play color="#22C55E" size={14} />
                  <Text style={[styles.ghostBtnText, { color: '#22C55E' }]}>
                    {actionLoading ? 'Resuming...' : 'Resume'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={handlePause}
                  disabled={actionLoading}
                >
                  <Pause color="#64748B" size={14} />
                  <Text style={styles.ghostBtnText}>
                    {actionLoading ? 'Pausing...' : 'Pause'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.ghostBtnDivider} />

              {/* Archive button */}
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleArchive}
                disabled={actionLoading}
              >
                <Archive color="#64748B" size={14} />
                <Text style={styles.ghostBtnText}>
                  {actionLoading ? 'Archiving...' : 'Archive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Archived notice */}
        {isArchived && (
          <View style={styles.archivedNotice}>
            <Text style={styles.archivedNoticeText}>
              This medication is archived. Restore it from the Cabinet to make changes.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit/Add Alarm Modal */}
      <Modal
        visible={alarmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlarmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAlarm ? 'Edit Alarm' : 'Add Alarm'}
              </Text>
              <TouchableOpacity onPress={() => setAlarmModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <TimeInput
              label="Time"
              value={editTime}
              onChange={setEditTime}
              placeholder="Select time"
            />

            <Text style={[styles.modalLabel, { marginTop: 20 }]}>Frequency</Text>
            <View style={styles.frequencyGrid}>
              {ALARM_FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyGridOption,
                    editFrequency === option.value && styles.frequencyGridOptionActive,
                  ]}
                  onPress={() => setEditFrequency(option.value as FrequencyType)}
                >
                  <View style={[styles.radioOuter, editFrequency === option.value && styles.radioOuterActive]}>
                    {editFrequency === option.value && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[
                      styles.frequencyGridText,
                      editFrequency === option.value && styles.frequencyGridTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day selector for "Specific Days" */}
            {editFrequency === 'custom' && (
              <View style={styles.daySelector}>
                <Text style={styles.daySelectorLabel}>Select days:</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayChip,
                        editSelectedDays.includes(day.value) && styles.dayChipActive,
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
                          styles.dayChipText,
                          editSelectedDays.includes(day.value) && styles.dayChipTextActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Interval input for "Every X Days" */}
            {editFrequency === 'every_other_day' && (
              <View style={styles.intervalSelector}>
                <Text style={styles.intervalLabel}>Every</Text>
                <View style={styles.intervalStepper}>
                  <TouchableOpacity
                    style={styles.intervalBtn}
                    onPress={() => setEditIntervalDays(Math.max(2, editIntervalDays - 1))}
                  >
                    <Text style={styles.intervalBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.intervalValue}>{editIntervalDays}</Text>
                  <TouchableOpacity
                    style={styles.intervalBtn}
                    onPress={() => setEditIntervalDays(editIntervalDays + 1)}
                  >
                    <Text style={styles.intervalBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.intervalLabel}>days</Text>
              </View>
            )}

            <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAlarm}>
              <Text style={styles.modalSaveBtnText}>
                {editingAlarm ? 'Save Changes' : 'Add Alarm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Medication Modal */}
      <Modal
        visible={editMedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentScrollable}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Medication</Text>
              <TouchableOpacity onPress={() => setEditMedModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Medication name"
              placeholderTextColor="#64748B"
            />

            {/* Critical Toggle */}
            <TouchableOpacity
              style={styles.criticalToggleRow}
              onPress={() => setEditIsCritical(!editIsCritical)}
              activeOpacity={0.7}
            >
              <View style={styles.criticalToggleLeft}>
                <AlertTriangle color={editIsCritical ? "#FB7185" : "#64748B"} size={20} strokeWidth={2.5} />
                <View>
                  <Text style={styles.criticalToggleLabel}>Mark as Critical</Text>
                  <Text style={styles.criticalToggleHint}>Essential medication - never skip</Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, editIsCritical && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, editIsCritical && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>

            {/* Dose - with wheel picker */}
            <Text style={styles.modalLabel}>Dose</Text>
            <View style={styles.dosePerIntakeRow}>
              <Text style={styles.dosePerIntakeLabel}>Per intake</Text>
              <TouchableOpacity
                style={styles.dosePickerButton}
                onPress={() => setShowDosePicker(true)}
              >
                <Text style={styles.dosePickerButtonText}>{editDoseSize}</Text>
                <ChevronDown color={colors.cyan} size={16} />
              </TouchableOpacity>
            </View>

            {/* Dose Picker Modal */}
            {showDosePicker && (
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDosePicker(false)}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Dose per intake</Text>
                  <TouchableOpacity onPress={() => setShowDosePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.wheelPickerContainer}>
                  <View style={styles.wheelPickerHighlight} />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    snapToInterval={50}
                    decelerationRate="fast"
                    contentContainerStyle={styles.wheelPickerContent}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.round(e.nativeEvent.contentOffset.y / 50);
                      const maxDose = editDoseUnit === 'mL' ? 50 : 10;
                      setEditDoseSize(Math.min(maxDose, Math.max(1, index + 1)));
                    }}
                  >
                    {Array.from({ length: editDoseUnit === 'mL' ? 50 : 10 }, (_, i) => i + 1).map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={styles.wheelPickerItem}
                        onPress={() => setEditDoseSize(num)}
                      >
                        <Text
                          style={[
                            styles.wheelPickerText,
                            editDoseSize === num && styles.wheelPickerTextActive,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TextInput
                  style={styles.pickerDirectInput}
                  value={doseInputText}
                  onFocus={() => setDoseInputText(editDoseSize.toString())}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setDoseInputText(numericText);
                  }}
                  onBlur={() => {
                    const maxDose = editDoseUnit === 'mL' ? 50 : 10;
                    const val = parseInt(doseInputText, 10);
                    if (!isNaN(val) && val >= 1 && val <= maxDose) {
                      setEditDoseSize(val);
                    } else if (!isNaN(val) && val > maxDose) {
                      setEditDoseSize(maxDose);
                    }
                    setDoseInputText('');
                  }}
                  onSubmitEditing={() => {
                    const maxDose = editDoseUnit === 'mL' ? 50 : 10;
                    const val = parseInt(doseInputText, 10);
                    if (!isNaN(val) && val >= 1 && val <= maxDose) {
                      setEditDoseSize(val);
                    } else if (!isNaN(val) && val > maxDose) {
                      setEditDoseSize(maxDose);
                    }
                    setDoseInputText('');
                  }}
                  keyboardType="number-pad"
                  placeholder={`Enter value (1-${editDoseUnit === 'mL' ? 50 : 10})`}
                  placeholderTextColor="#64748B"
                  maxLength={2}
                />
              </View>
            )}

            {/* Dose Unit Selector */}
            <View style={styles.doseUnitOptions}>
              {DOSE_UNITS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.doseUnitOption,
                    editDoseUnit === option.value && styles.doseUnitOptionActive,
                  ]}
                  onPress={() => setEditDoseUnit(option.value)}
                >
                  <Text
                    style={[
                      styles.doseUnitOptionText,
                      editDoseUnit === option.value && styles.doseUnitOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Current Stock</Text>
            <TextInput
              style={styles.modalInput}
              value={editStock}
              onChangeText={setEditStock}
              placeholder="Number of doses"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
            />

            <View style={styles.endDateSection}>
              <DateInput
                label="End Date (Optional)"
                value={editEndDate}
                onChange={handleEditEndDateChange}
                placeholder="No end date (ongoing)"
              />
              {editEndDate && (
                <TouchableOpacity
                  style={styles.clearEndDateBtn}
                  onPress={() => setEditEndDate('')}
                >
                  <Text style={styles.clearEndDateText}>Clear end date (make ongoing)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Expandable Additional Details */}
            <TouchableOpacity
              style={styles.editExpandHeader}
              onPress={() => setEditDetailsExpanded(!editDetailsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.editExpandHeaderText}>Additional Details</Text>
              {editDetailsExpanded ? (
                <ChevronUp color={colors.cyan} size={20} />
              ) : (
                <ChevronDown color={colors.cyan} size={20} />
              )}
            </TouchableOpacity>

            {editDetailsExpanded && (
              <View style={styles.editExpandedContent}>
                <Text style={styles.modalLabel}>Strength</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editStrength}
                  onChangeText={setEditStrength}
                  placeholder="e.g., 20mg"
                  placeholderTextColor="#64748B"
                />

                <View style={styles.expirySection}>
                  <DateInput
                    label="Expiry Date (Optional)"
                    value={editExpiryDate}
                    onChange={setEditExpiryDate}
                    placeholder="Select expiry date"
                  />
                  {editExpiryDate && (
                    <TouchableOpacity
                      style={styles.clearExpiryBtn}
                      onPress={() => setEditExpiryDate('')}
                    >
                      <Text style={styles.clearExpiryText}>Clear expiry date</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.modalLabel}>Meal Relation</Text>
                <View style={styles.mealOptions}>
                  {MEAL_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.mealOption,
                        editMealRelation === option.value && styles.mealOptionActive,
                      ]}
                      onPress={() => setEditMealRelation(option.value as MealRelationType)}
                    >
                      <Text
                        style={[
                          styles.mealOptionText,
                          editMealRelation === option.value && styles.mealOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Indication / Purpose</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editIndication}
                  onChangeText={setEditIndication}
                  placeholder="What is this medication for?"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.modalLabel}>Special Instructions</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput]}
                  value={editSpecialInstructions}
                  onChangeText={setEditSpecialInstructions}
                  placeholder="Any special instructions"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.modalLabel}>Known Allergies</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editAllergies}
                  onChangeText={setEditAllergies}
                  placeholder="Related allergies or sensitivities"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.modalLabel}>Brand Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editBrandName}
                  onChangeText={setEditBrandName}
                  placeholder="Brand or manufacturer"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.modalLabel}>Prescribing Doctor</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDoctorName}
                  onChangeText={setEditDoctorName}
                  placeholder="Doctor's name"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.modalLabel}>Pharmacy</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPharmacyName}
                  onChangeText={setEditPharmacyName}
                  placeholder="Pharmacy name"
                  placeholderTextColor="#64748B"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              onPress={saveMedication}
              disabled={saving}
            >
              <Text style={styles.modalSaveBtnText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Refill Modal */}
      <Modal
        visible={refillModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.refillModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Refill</Text>
              <TouchableOpacity onPress={() => setRefillModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Current stock display */}
            <View style={styles.refillCurrentStock}>
              <Text style={styles.refillCurrentStockLabel}>Current Stock</Text>
              <Text style={styles.refillCurrentStockValue}>
                {medication ? INVENTORY_CONFIG.formatStockDisplay(medication.current_stock, medication.initial_stock, medication.dose_unit) : ''}
              </Text>
            </View>

            {/* Quick add chips */}
            <Text style={styles.refillQuickLabel}>Quick Add</Text>
            <View style={styles.refillChipsRow}>
              {[30, 60, 90].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.refillChip,
                    refillAmount === amount.toString() && styles.refillChipActive,
                  ]}
                  onPress={() => handleQuickRefill(amount)}
                >
                  <Text
                    style={[
                      styles.refillChipText,
                      refillAmount === amount.toString() && styles.refillChipTextActive,
                    ]}
                  >
                    +{amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount input */}
            <Text style={styles.refillCustomLabel}>Or enter custom amount</Text>
            <TextInput
              style={styles.refillInput}
              value={refillAmount}
              onChangeText={setRefillAmount}
              placeholder="Enter amount"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
            />

            {/* New total preview */}
            {refillAmount && parseInt(refillAmount, 10) > 0 && medication && (() => {
              const newTotal = (medication.current_stock || 0) + parseInt(refillAmount, 10);
              const newInitial = Math.max(medication.initial_stock, newTotal);
              return (
                <View style={styles.refillPreview}>
                  <Text style={styles.refillPreviewLabel}>New Total</Text>
                  <Text style={styles.refillPreviewValue}>
                    {INVENTORY_CONFIG.formatStockDisplay(newTotal, newInitial, medication.dose_unit)}
                  </Text>
                </View>
              );
            })()}

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.refillConfirmBtn,
                (!refillAmount || refillLoading) && styles.refillConfirmBtnDisabled,
              ]}
              onPress={handleConfirmRefill}
              disabled={!refillAmount || refillLoading}
            >
              <Text style={styles.refillConfirmBtnText}>
                {refillLoading ? 'Saving...' : 'Confirm Refill'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },

  // Medication Card
  medicationCard: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  archivedCard: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.8,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medCardInfo: {
    flex: 1,
  },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 113, 133, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.3)',
  },
  criticalText: {
    color: '#FB7185',
    fontSize: 11,
    fontWeight: '700',
  },
  editMedBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medName: {
    color: colors.cyan,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  medStrength: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  inventorySection: {
    marginTop: 4,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inventoryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  endDateDisplay: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  endDateLabel: {
    color: '#FB7185',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  endDateValue: {
    color: '#FB7185',
    fontSize: 16,
    fontWeight: '700',
  },
  endDateSection: {
    marginTop: 16,
  },
  clearEndDateBtn: {
    marginTop: 8,
    padding: 8,
  },
  clearEndDateText: {
    color: '#64748B',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Daily Schedule
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  scheduleContainer: {
    marginBottom: 20,
  },
  timelineConnector: {
    position: 'absolute',
    left: 11,
    top: -20,
    width: 2,
    height: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.3)',
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cyan,
  },
  timeContainer: {
    marginRight: 12,
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  ampmText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  periodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  frequencyBadge: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 'auto',
  },
  frequencyText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '600',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add Alarm Button
  addAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 16,
  },
  addAlarmText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },

  // As-needed schedule display
  asNeededScheduleContainer: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  asNeededScheduleText: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  asNeededScheduleHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Archived notice
  archivedNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  archivedNoticeText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A0B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalContentScrollable: {
    backgroundColor: '#0A0A0B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalScrollView: {
    flexGrow: 0,
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
  // Frequency Grid (2x2)
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyGridOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  frequencyGridOptionActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderColor: colors.cyan,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: colors.cyan,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  frequencyGridText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  frequencyGridTextActive: {
    color: colors.textPrimary,
  },

  // Day Selector
  daySelector: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0A0F14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  daySelectorLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.2)',
    borderColor: colors.cyan,
  },
  dayChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: colors.cyan,
  },

  // Interval Selector
  intervalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0A0F14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  intervalLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  intervalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intervalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalBtnText: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: '700',
  },
  intervalValue: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },

  modalSaveBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveBtnText: {
    color: '#0A0A0B',
    fontSize: 15,
    fontWeight: '700',
  },

  // Expandable Medical Details Section (View Mode)
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandHeaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  expandedContent: {
    marginTop: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Expandable Additional Details (Edit Modal)
  editExpandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  editExpandHeaderText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  editExpandedContent: {
    marginTop: 8,
  },
  doseSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  doseSizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseSizeBtnText: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '700',
  },
  doseSizeValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  mealOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mealOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealOptionActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderColor: colors.cyan,
  },
  mealOptionText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  mealOptionTextActive: {
    color: colors.cyan,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // Dose Unit Options
  doseUnitOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  doseUnitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  doseUnitOptionActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderColor: colors.cyan,
  },
  doseUnitOptionText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  doseUnitOptionTextActive: {
    color: colors.cyan,
  },

  // Dose Picker (for edit modal)
  dosePerIntakeRow: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dosePerIntakeLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  dosePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dosePickerButtonText: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '700',
  },

  // Wheel Picker Modal (for dose picker)
  pickerModal: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerCancel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerDone: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  wheelPickerContainer: {
    height: 150,
    position: 'relative',
    marginVertical: 8,
  },
  wheelPickerHighlight: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    height: 50,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderRadius: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  wheelPickerContent: {
    paddingVertical: 50,
  },
  wheelPickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelPickerText: {
    color: '#64748B',
    fontSize: 22,
    fontWeight: '500',
  },
  wheelPickerTextActive: {
    color: colors.cyan,
    fontSize: 24,
    fontWeight: '700',
  },
  pickerDirectInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },

  // Expiry Section
  expirySection: {
    marginTop: 16,
  },
  clearExpiryBtn: {
    marginTop: 8,
    padding: 8,
  },
  clearExpiryText: {
    color: '#64748B',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Expiry display in view mode
  expiryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  expiryWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiryWarningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },

  // Critical Toggle
  criticalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0F14',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  criticalToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  criticalToggleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  criticalToggleHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(251, 113, 133, 0.3)',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#64748B',
  },
  toggleKnobActive: {
    backgroundColor: '#FB7185',
    alignSelf: 'flex-end',
  },

  // Action Buttons (Pause/Resume/Archive) - Ghost style
  actionButtonsContainer: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ghostBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  ghostBtnDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pausedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
  },
  pausedIndicatorText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },

  // Refill Button
  refillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  refillBtnText: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: '600',
  },
  refillBtnStock: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Refill Modal
  refillModalContent: {
    backgroundColor: '#0F1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  refillCurrentStock: {
    backgroundColor: '#0A0F14',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  refillCurrentStockLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  refillCurrentStockValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  refillQuickLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refillChipsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  refillChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  refillChipActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderColor: colors.cyan,
  },
  refillChipText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  refillChipTextActive: {
    color: colors.cyan,
  },
  refillCustomLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  refillInput: {
    backgroundColor: '#0A0F14',
    borderRadius: 12,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  refillPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
  },
  refillPreviewLabel: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '500',
  },
  refillPreviewValue: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '700',
  },
  refillConfirmBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  refillConfirmBtnDisabled: {
    opacity: 0.5,
  },
  refillConfirmBtnText: {
    color: '#0A0A0B',
    fontSize: 16,
    fontWeight: '700',
  },
});
