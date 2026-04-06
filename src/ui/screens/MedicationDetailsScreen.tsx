import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Pencil, Trash2, Plus, Sun, Moon, CloudMoon, ChevronDown, ChevronUp, AlertTriangle, Pause, Play, Archive, Package, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';
import { medicationService } from '../../data/services/medicationService';
import { feedService } from '../../data/services/feedService';
import TimeInput from '../components/TimeInput';
import DateInput from '../components/DateInput';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';
import type { Medication, MedicationUpdate } from '../../domain/types';
import type { RootStackScreenProps } from '../navigation/types';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../../data/services/authService';
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
  calculateLowStockDoses,
  getProgressBarColor,
  toBackendFrequency,
  formatFrequencyDisplay,
  formatMealRelation,
  type MealRelationType,
  type DoseUnitType,
} from '../../domain/medicationConfig';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useSubscription } from '../hooks/useSubscription';
import UpgradePromptModal from '../components/UpgradePromptModal';

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

/** Split time into display parts for the schedule timeline UI. */
const formatTimeSplit = (time: string, tf: '12h' | '24h'): { time: string; period: string } => {
  const [hours, minutes] = (time || '00:00').split(':').map(Number);
  if (tf === '24h') {
    return {
      time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      period: '',
    };
  }
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
  const { showAlert } = useAlert();
  const { isEmailVerified } = useAuth();
  const { prefs: { timeFormat, defaultDoseTime } } = useAppPreferences();
  const { colors, isDark } = useTheme();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('MedicationDetails');
  const { prefs: notifPrefs } = useNotificationPrefs();
  const { isFree, subscriptionEnabled } = useSubscription();
  const isFreeTier = subscriptionEnabled && isFree;
  const [showDoseHistoryUpgrade, setShowDoseHistoryUpgrade] = useState(false);
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
      showAlert({ title: 'Error', message: msg, type: 'error' });
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
    // Check if medication course has ended
    if (medication?.end_date) {
      const endDate = new Date(medication.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < today) {
        const formattedDate = endDate.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        showAlert({
          title: 'Course Ended',
          message: `This medication course ended on ${formattedDate}. Please extend or remove the end date before adding new alarms.`,
          type: 'warning',
        });
        return;
      }
    }

    setEditingAlarm(null);
    setEditTime(defaultDoseTime || '12:00');
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
    // Check for duplicate time — exclude the alarm being edited
    const otherAlarms = editingAlarm
      ? alarms.filter((a) => a.id !== editingAlarm.id)
      : alarms;
    const isDuplicate = otherAlarms.some((a) => a.time === editTime);

    if (isDuplicate) {
      showAlert({
        title: 'Duplicate Alarm',
        message: `An alarm at ${editTime} already exists for this medication.`,
        type: 'warning',
      });
      return;
    }

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
        showAlert({ title: 'Error', message: 'Failed to save alarm changes', type: 'error' });
      }
    }

    setAlarmModalVisible(false);
  };

  const removeAlarm = async (id: string) => {
    if (alarms.length <= 1) {
      showAlert({
        title: 'Cannot Remove',
        message: 'You need at least one alarm time.',
        type: 'warning',
      });
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

    showAlert({
      title: 'Remove Alarm',
      message: 'Are you sure you want to remove this alarm?',
      type: 'destructive',
      confirmLabel: 'Remove',
      onConfirm: doRemove,
    });
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
        showAlert({
          title: 'Invalid Date',
          message: VALIDATION.endDate.errorMessage,
          type: 'warning',
        });
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
        showAlert({
          title: 'Invalid Date',
          message: VALIDATION.endDate.errorMessage,
          type: 'warning',
        });
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

      // Create low stock alert if stock is below dynamic threshold and refill alerts are enabled
      const refillEnabled = notifPrefs?.refill_alerts_enabled ?? true;
      const thresholdDays = notifPrefs?.low_stock_threshold_days ?? 7;
      const dosesPerDay = getDoseTimes(medication).length;
      const lowStockThreshold = calculateLowStockDoses(editDoseSize, dosesPerDay, thresholdDays);
      if (refillEnabled && newStock < lowStockThreshold) {
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

      const successMsg = refillEnabled && newStock < lowStockThreshold
        ? `Medication updated. Low stock alert created (${newStock} doses remaining).`
        : 'Medication updated successfully';
      showAlert({ title: 'Success', message: successMsg, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to update medication';
      showAlert({ title: 'Error', message: errorMsg, type: 'error' });
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
      showAlert({ title: 'Success', message: `${medication.name} paused`, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to pause medication';
      showAlert({ title: 'Error', message: errorMsg, type: 'error' });
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
      showAlert({ title: 'Success', message: `${medication.name} resumed`, type: 'success' });
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to resume medication';
      showAlert({ title: 'Error', message: errorMsg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!medication || actionLoading) return;
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

    const confirmArchive = () => {
      setActionLoading(true);
      medicationService.archive(medicationId)
        .then(() => {
          showAlert({ title: 'Success', message: `${medication.name} archived`, type: 'success' });
          navigation.goBack();
        })
        .catch((e: any) => {
          const errorMsg = e?.message || 'Failed to archive medication';
          showAlert({ title: 'Error', message: errorMsg, type: 'error' });
        })
        .finally(() => {
          setActionLoading(false);
        });
    };

    showAlert({
      title: 'Archive Medication',
      message: `Archive ${medication.name}? It will be moved to History.`,
      type: 'destructive',
      confirmLabel: 'Archive',
      onConfirm: confirmArchive,
    });
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
      showAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid refill amount',
        type: 'warning',
      });
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
      showAlert({
        title: 'Refill Logged',
        message: `Added ${amount} doses. New total: ${refillLog.new_stock}`,
        type: 'success',
      });
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to log refill';
      showAlert({ title: 'Error', message: errorMsg, type: 'error' });
    } finally {
      setRefillLoading(false);
    }
  };

  if (loading || !medication) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stockPct = calculateStockPercentage(medication.current_stock, medication.initial_stock);
  const progressBarColor = getProgressBarColor(stockPct);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isArchived ? 'Archived Ritual' : 'Ritual Management'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Medication Card */}
        <View style={[styles.medicationCard, { backgroundColor: colors.bgDark, borderColor: colors.cyanGlow }, isArchived && { borderColor: colors.borderSubtle, opacity: 0.8 }]}>
          <View style={styles.medCardHeader}>
            <View style={styles.medCardInfo}>
              <View style={styles.medNameRow}>
                <Text style={[styles.medName, { color: colors.cyan }]}>{medication.name}</Text>
                {medication.is_critical && (
                  <View style={styles.criticalBadge}>
                    <AlertTriangle color="#FB7185" size={14} strokeWidth={3} />
                    <Text style={styles.criticalText}>Critical</Text>
                  </View>
                )}
              </View>
              {medication.strength && (
                <Text style={[styles.medStrength, { color: colors.textSecondary }]}>{medication.strength}</Text>
              )}
            </View>
            {!isArchived && (
              <TouchableOpacity style={[styles.editMedBtn, { backgroundColor: colors.cyanDim }]} onPress={openEditMedModal}>
                <Pencil color={colors.cyan} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar and inventory */}
          <View style={styles.inventorySection}>
            <View style={styles.inventoryHeader}>
              <Text style={[styles.inventoryLabel, { color: colors.textSecondary }]}>CURRENT INVENTORY</Text>
              <Text style={[styles.inventoryValue, { color: progressBarColor }]}>
                {INVENTORY_CONFIG.formatStockDisplay(medication.current_stock, medication.initial_stock, medication.dose_unit)}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.bgInput }]}>
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
            <View style={[styles.endDateDisplay, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.endDateLabel, { color: colors.error }]}>ENDS ON</Text>
              <Text style={[styles.endDateValue, { color: colors.error }]}>
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
            style={[styles.expandHeader, { borderTopColor: colors.borderSubtle }]}
            onPress={() => setDetailsExpanded(!detailsExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandHeaderText, { color: colors.textSecondary }]}>Medical Details</Text>
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
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DOSE</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {medication.dose_size || 1} {medication.dose_unit || 'tablet'}(s)
                </Text>
              </View>

              {/* Expiry Date */}
              {medication.expiry_date && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>EXPIRY DATE</Text>
                  <View style={styles.expiryValueRow}>
                    <Text style={[
                      styles.detailValue,
                      { color: colors.textPrimary },
                      new Date(medication.expiry_date) < new Date() && { color: colors.error },
                      new Date(medication.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                      new Date(medication.expiry_date) >= new Date() && { color: colors.warning },
                    ]}>
                      {new Date(medication.expiry_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    {new Date(medication.expiry_date) < new Date() && (
                      <View style={styles.expiryWarningBadge}>
                        <AlertCircle color={colors.error} size={12} />
                        <Text style={[styles.expiryWarningText, { color: colors.error }]}>Expired</Text>
                      </View>
                    )}
                    {new Date(medication.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                     new Date(medication.expiry_date) >= new Date() && (
                      <View style={[styles.expiryWarningBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)' }]}>
                        <AlertCircle color={colors.warning} size={12} />
                        <Text style={[styles.expiryWarningText, { color: colors.warning }]}>Expiring soon</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>MEAL RELATION</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {formatMealRelation(medication.meal_relation)}
                </Text>
              </View>

              {/* Indication */}
              {medication.indication && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>INDICATION</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{medication.indication}</Text>
                </View>
              )}

              {/* Special Instructions */}
              {medication.special_instructions && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SPECIAL INSTRUCTIONS</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{medication.special_instructions}</Text>
                </View>
              )}

              {/* Allergies */}
              {medication.allergies && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ALLERGIES</Text>
                  <Text style={[styles.detailValue, { color: '#FB7185' }]}>{medication.allergies}</Text>
                </View>
              )}

              {/* Brand Name */}
              {medication.brand_name && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>BRAND NAME</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{medication.brand_name}</Text>
                </View>
              )}

              {/* Doctor */}
              {medication.doctor_name && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PRESCRIBING DOCTOR</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{medication.doctor_name}</Text>
                </View>
              )}

              {/* Pharmacy */}
              {medication.pharmacy_name && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PHARMACY</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{medication.pharmacy_name}</Text>
                </View>
              )}

              {/* Start Date */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>STARTED ON</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule</Text>
            <View style={[styles.asNeededScheduleContainer, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.asNeededScheduleText, { color: colors.cyan }]}>Take as needed</Text>
              <Text style={[styles.asNeededScheduleHint, { color: colors.textSecondary }]}>
                No scheduled reminders — log doses when you take them
              </Text>
            </View>
            {/* Option to add a schedule (converts from as-needed to scheduled) */}
            {!isArchived && (
              <TouchableOpacity style={[styles.addAlarmBtn, { borderColor: colors.cyanGlow }]} onPress={openAddAlarmModal}>
                <Plus color={colors.cyan} size={18} />
                <Text style={[styles.addAlarmText, { color: colors.cyan }]}>Add Schedule</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Schedule</Text>

            <View style={styles.scheduleContainer}>
              {alarms.map((alarm, index) => {
                const { time: formattedTime, period: ampm } = formatTimeSplit(alarm.time, timeFormat);
                return (
                  <View key={alarm.id}>
                    {/* Timeline connector */}
                    {index > 0 && <View style={[styles.timelineConnector, { backgroundColor: colors.cyanGlow }]} />}

                    <View style={[styles.alarmRow, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}>
                      {/* Timeline dot */}
                      <View style={[styles.timelineDot, { backgroundColor: isDark ? 'rgba(0, 209, 255, 0.2)' : 'rgba(0, 151, 184, 0.15)' }]}>
                        <View style={[styles.timelineDotInner, { backgroundColor: colors.cyan }]} />
                      </View>

                      {/* Time display */}
                      <View style={styles.timeContainer}>
                        <Text style={[styles.timeText, { color: colors.textPrimary }]}>{formattedTime}</Text>
                        <Text style={[styles.ampmText, { color: colors.textSecondary }]}>{ampm}</Text>
                      </View>

                      {/* Period icon */}
                      <View style={[styles.periodIcon, { backgroundColor: colors.cyanDim }]}>
                        {getPeriodIcon(alarm.period)}
                      </View>

                      {/* Frequency badge */}
                      <View style={[styles.frequencyBadge, { backgroundColor: colors.cyanDim, borderColor: colors.cyanGlow }]}>
                        <Text style={[styles.frequencyText, { color: colors.cyan }]}>{formatFrequencyDisplay(alarm.frequency, medication?.custom_days)}</Text>
                      </View>

                      {/* Edit and Delete buttons - only show if not archived */}
                      {!isArchived && (
                        <>
                          <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: colors.bgSubtle }]}
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
              <TouchableOpacity style={[styles.addAlarmBtn, { borderColor: colors.cyanGlow }]} onPress={openAddAlarmModal}>
                <Plus color={colors.cyan} size={18} />
                <Text style={[styles.addAlarmText, { color: colors.cyan }]}>Add New Alarm</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Dose History upgrade CTA for free users */}
        {isFreeTier && (
          <TouchableOpacity
            style={[styles.doseHistoryCta, { borderColor: colors.cyanGlow, backgroundColor: colors.cyanDim }]}
            onPress={() => setShowDoseHistoryUpgrade(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.doseHistoryCtaText, { color: colors.cyan }]}>
              See your complete dose history
            </Text>
            <Text style={[styles.doseHistoryCtaSub, { color: colors.textMuted }]}>
              Available with Premium
            </Text>
          </TouchableOpacity>
        )}

        {/* Log Refill Button - prominent action */}
        {!isArchived && (
          <TouchableOpacity
            style={[styles.refillBtn, { backgroundColor: colors.cyanDim, borderColor: colors.cyanGlow }]}
            onPress={openRefillModal}
            activeOpacity={0.8}
          >
            <Package color={colors.cyan} size={18} />
            <Text style={[styles.refillBtnText, { color: colors.cyan }]}>Log Refill</Text>
            <Text style={[styles.refillBtnStock, { color: colors.textSecondary }]}>{medication.current_stock} {medication.dose_unit || 'doses'} in stock</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons - Pause/Resume/Archive - small ghost buttons at bottom */}
        {!isArchived && (
          <View style={styles.actionButtonsContainer}>
            {/* Paused status indicator */}
            {medication.is_paused && (
              <View style={[styles.pausedIndicator, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(217, 119, 6, 0.08)' }]}>
                <Pause color={colors.warning} size={14} />
                <Text style={[styles.pausedIndicatorText, { color: colors.warning }]}>
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
                  <Play color={colors.success} size={14} />
                  <Text style={[styles.ghostBtnText, { color: colors.success }]}>
                    {actionLoading ? 'Resuming...' : 'Resume'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={handlePause}
                  disabled={actionLoading}
                >
                  <Pause color={colors.textMuted} size={14} />
                  <Text style={[styles.ghostBtnText, { color: colors.textMuted }]}>
                    {actionLoading ? 'Pausing...' : 'Pause'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={[styles.ghostBtnDivider, { backgroundColor: colors.borderSubtle }]} />

              {/* Archive button */}
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleArchive}
                disabled={actionLoading}
              >
                <Archive color={colors.textMuted} size={14} />
                <Text style={[styles.ghostBtnText, { color: colors.textMuted }]}>
                  {actionLoading ? 'Archiving...' : 'Archive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Archived notice */}
        {isArchived && (
          <View style={[styles.archivedNotice, { backgroundColor: colors.bgSubtle }]}>
            <Text style={[styles.archivedNoticeText, { color: colors.textSecondary }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
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

            <Text style={[styles.modalLabel, { marginTop: 20, color: colors.textSecondary }]}>Frequency</Text>
            <View style={styles.frequencyGrid}>
              {ALARM_FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyGridOption,
                    { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
                    editFrequency === option.value && { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
                  ]}
                  onPress={() => setEditFrequency(option.value as FrequencyType)}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.textMuted }, editFrequency === option.value && { borderColor: colors.cyan }]}>
                    {editFrequency === option.value && <View style={[styles.radioInner, { backgroundColor: colors.cyan }]} />}
                  </View>
                  <Text
                    style={[
                      styles.frequencyGridText,
                      { color: colors.textSecondary },
                      editFrequency === option.value && { color: colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day selector for "Specific Days" */}
            {editFrequency === 'custom' && (
              <View style={[styles.daySelector, { backgroundColor: colors.bgDark, borderColor: isDark ? 'rgba(0, 209, 255, 0.2)' : colors.cyanGlow }]}>
                <Text style={[styles.daySelectorLabel, { color: colors.textSecondary }]}>Select days:</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayChip,
                        { backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle },
                        editSelectedDays.includes(day.value) && { backgroundColor: isDark ? 'rgba(0, 209, 255, 0.2)' : colors.cyanDim, borderColor: colors.cyan },
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
                          { color: colors.textMuted },
                          editSelectedDays.includes(day.value) && { color: colors.cyan },
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
              <View style={[styles.intervalSelector, { backgroundColor: colors.bgDark, borderColor: isDark ? 'rgba(0, 209, 255, 0.2)' : colors.cyanGlow }]}>
                <Text style={[styles.intervalLabel, { color: colors.textPrimary }]}>Every</Text>
                <View style={styles.intervalStepper}>
                  <TouchableOpacity
                    style={[styles.intervalBtn, { backgroundColor: colors.cyanDim }]}
                    onPress={() => setEditIntervalDays(Math.max(2, editIntervalDays - 1))}
                  >
                    <Text style={[styles.intervalBtnText, { color: colors.cyan }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.intervalValue, { color: colors.cyan }]}>{editIntervalDays}</Text>
                  <TouchableOpacity
                    style={[styles.intervalBtn, { backgroundColor: colors.cyanDim }]}
                    onPress={() => setEditIntervalDays(editIntervalDays + 1)}
                  >
                    <Text style={[styles.intervalBtnText, { color: colors.cyan }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.intervalLabel, { color: colors.textPrimary }]}>days</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.cyan }]} onPress={saveAlarm}>
              <Text style={[styles.modalSaveBtnText, { color: colors.bg }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.modalContentScrollable, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Medication</Text>
              <TouchableOpacity onPress={() => setEditMedModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Medication name"
              placeholderTextColor={colors.textMuted}
            />

            {/* Critical Toggle */}
            <TouchableOpacity
              style={[styles.criticalToggleRow, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              onPress={() => setEditIsCritical(!editIsCritical)}
              activeOpacity={0.7}
            >
              <View style={styles.criticalToggleLeft}>
                <AlertTriangle color={editIsCritical ? "#FB7185" : colors.textMuted} size={20} strokeWidth={2.5} />
                <View>
                  <Text style={[styles.criticalToggleLabel, { color: colors.textPrimary }]}>Mark as Critical</Text>
                  <Text style={[styles.criticalToggleHint, { color: colors.textMuted }]}>Essential medication - never skip</Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: colors.bgInput }, editIsCritical && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, { backgroundColor: colors.textMuted }, editIsCritical && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>

            {/* Dose - with wheel picker */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Dose</Text>
            <View style={[styles.dosePerIntakeRow, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.dosePerIntakeLabel, { color: colors.textPrimary }]}>Per intake</Text>
              <TouchableOpacity
                style={[styles.dosePickerButton, { backgroundColor: colors.cyanDim }]}
                onPress={() => setShowDosePicker(true)}
              >
                <Text style={[styles.dosePickerButtonText, { color: colors.cyan }]}>{editDoseSize}</Text>
                <ChevronDown color={colors.cyan} size={16} />
              </TouchableOpacity>
            </View>

            {/* Dose Picker Modal */}
            {showDosePicker && (
              <View style={[styles.pickerModal, { backgroundColor: colors.bgDark, borderColor: colors.cyanGlow }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.borderSubtle }]}>
                  <TouchableOpacity onPress={() => setShowDosePicker(false)}>
                    <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Dose per intake</Text>
                  <TouchableOpacity onPress={() => setShowDosePicker(false)}>
                    <Text style={[styles.pickerDone, { color: colors.cyan }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.wheelPickerContainer}>
                  <View style={[styles.wheelPickerHighlight, { backgroundColor: colors.cyanDim, borderColor: colors.cyanGlow }]} />
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
                            { color: colors.textMuted },
                            editDoseSize === num && styles.wheelPickerTextActive,
                            editDoseSize === num && { color: colors.cyan },
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TextInput
                  style={[styles.pickerDirectInput, { color: colors.textPrimary, backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle }]}
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
                  placeholderTextColor={colors.textMuted}
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
                    { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
                    editDoseUnit === option.value && { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
                  ]}
                  onPress={() => setEditDoseUnit(option.value)}
                >
                  <Text
                    style={[
                      styles.doseUnitOptionText,
                      { color: colors.textSecondary },
                      editDoseUnit === option.value && { color: colors.cyan },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Current Stock</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={editStock}
              onChangeText={setEditStock}
              placeholder="Number of doses"
              placeholderTextColor={colors.textMuted}
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
                  <Text style={[styles.clearEndDateText, { color: colors.textMuted }]}>Clear end date (make ongoing)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Expandable Additional Details */}
            <TouchableOpacity
              style={[styles.editExpandHeader, { backgroundColor: colors.cyanDim, borderColor: isDark ? 'rgba(0, 209, 255, 0.2)' : colors.cyanGlow }]}
              onPress={() => setEditDetailsExpanded(!editDetailsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={[styles.editExpandHeaderText, { color: colors.cyan }]}>Additional Details</Text>
              {editDetailsExpanded ? (
                <ChevronUp color={colors.cyan} size={20} />
              ) : (
                <ChevronDown color={colors.cyan} size={20} />
              )}
            </TouchableOpacity>

            {editDetailsExpanded && (
              <View style={styles.editExpandedContent}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Strength</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editStrength}
                  onChangeText={setEditStrength}
                  placeholder="e.g., 20mg"
                  placeholderTextColor={colors.textMuted}
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
                      <Text style={[styles.clearExpiryText, { color: colors.textMuted }]}>Clear expiry date</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Meal Relation</Text>
                <View style={styles.mealOptions}>
                  {MEAL_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.mealOption,
                        { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
                        editMealRelation === option.value && { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
                      ]}
                      onPress={() => setEditMealRelation(option.value as MealRelationType)}
                    >
                      <Text
                        style={[
                          styles.mealOptionText,
                          { color: colors.textSecondary },
                          editMealRelation === option.value && { color: colors.cyan },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Indication / Purpose</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editIndication}
                  onChangeText={setEditIndication}
                  placeholder="What is this medication for?"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Special Instructions</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editSpecialInstructions}
                  onChangeText={setEditSpecialInstructions}
                  placeholder="Any special instructions"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Known Allergies</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editAllergies}
                  onChangeText={setEditAllergies}
                  placeholder="Related allergies or sensitivities"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Brand Name</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editBrandName}
                  onChangeText={setEditBrandName}
                  placeholder="Brand or manufacturer"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Prescribing Doctor</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editDoctorName}
                  onChangeText={setEditDoctorName}
                  placeholder="Doctor's name"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pharmacy</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                  value={editPharmacyName}
                  onChangeText={setEditPharmacyName}
                  placeholder="Pharmacy name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.cyan }, saving && styles.modalSaveBtnDisabled]}
              onPress={saveMedication}
              disabled={saving}
            >
              <Text style={[styles.modalSaveBtnText, { color: colors.bg }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.refillModalContent, { backgroundColor: colors.bgElevated }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log Refill</Text>
              <TouchableOpacity onPress={() => setRefillModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Current stock display */}
            <View style={[styles.refillCurrentStock, { backgroundColor: colors.bgDark }]}>
              <Text style={[styles.refillCurrentStockLabel, { color: colors.textSecondary }]}>Current Stock</Text>
              <Text style={[styles.refillCurrentStockValue, { color: colors.textPrimary }]}>
                {medication ? INVENTORY_CONFIG.formatStockDisplay(medication.current_stock, medication.initial_stock, medication.dose_unit) : ''}
              </Text>
            </View>

            {/* Quick add chips */}
            <Text style={[styles.refillQuickLabel, { color: colors.textSecondary }]}>Quick Add</Text>
            <View style={styles.refillChipsRow}>
              {[30, 60, 90].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.refillChip,
                    { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
                    refillAmount === amount.toString() && { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
                  ]}
                  onPress={() => handleQuickRefill(amount)}
                >
                  <Text
                    style={[
                      styles.refillChipText,
                      { color: colors.textSecondary },
                      refillAmount === amount.toString() && { color: colors.cyan },
                    ]}
                  >
                    +{amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount input */}
            <Text style={[styles.refillCustomLabel, { color: colors.textSecondary }]}>Or enter custom amount</Text>
            <TextInput
              style={[styles.refillInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={refillAmount}
              onChangeText={setRefillAmount}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            {/* New total preview */}
            {refillAmount && parseInt(refillAmount, 10) > 0 && medication && (() => {
              const newTotal = (medication.current_stock || 0) + parseInt(refillAmount, 10);
              const newInitial = Math.max(medication.initial_stock, newTotal);
              return (
                <View style={[styles.refillPreview, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.08)' }]}>
                  <Text style={[styles.refillPreviewLabel, { color: colors.success }]}>New Total</Text>
                  <Text style={[styles.refillPreviewValue, { color: colors.success }]}>
                    {INVENTORY_CONFIG.formatStockDisplay(newTotal, newInitial, medication.dose_unit)}
                  </Text>
                </View>
              );
            })()}

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.refillConfirmBtn,
                { backgroundColor: colors.cyan },
                (!refillAmount || refillLoading) && styles.refillConfirmBtnDisabled,
              ]}
              onPress={handleConfirmRefill}
              disabled={!refillAmount || refillLoading}
            >
              <Text style={[styles.refillConfirmBtnText, { color: colors.bg }]}>
                {refillLoading ? 'Saving...' : 'Confirm Refill'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />

      <UpgradePromptModal
        visible={showDoseHistoryUpgrade}
        featureName="Full Dose History"
        description="Access your complete dose history, detailed adherence logs, and long-term tracking with Premium."
        onUpgrade={() => {
          setShowDoseHistoryUpgrade(false);
          navigation.navigate('Paywall' as any);
        }}
        onDismiss={() => setShowDoseHistoryUpgrade(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '600',
  },

  // Medication Card
  medicationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  medName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  medStrength: {
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
  },
  endDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  endDateValue: {
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
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Daily Schedule
  sectionTitle: {
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
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeContainer: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  frequencyBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 'auto',
  },
  frequencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 16,
  },
  addAlarmText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // As-needed schedule display
  asNeededScheduleContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  asNeededScheduleText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  asNeededScheduleHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Archived notice
  archivedNotice: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  archivedNoticeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalContentScrollable: {
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
    fontSize: 20,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
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
    borderWidth: 1,
    gap: 8,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  frequencyGridText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Day Selector
  daySelector: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  daySelectorLabel: {
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
    borderWidth: 1,
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Interval Selector
  intervalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  intervalLabel: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  intervalValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },

  modalSaveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveBtnText: {
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
  },
  expandHeaderText: {
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
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
    borderRadius: 12,
    borderWidth: 1,
  },
  editExpandHeaderText: {
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseSizeBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  doseSizeValue: {
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
    borderWidth: 1,
  },
  mealOptionText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderWidth: 1,
  },
  doseUnitOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Dose Picker (for edit modal)
  dosePerIntakeRow: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dosePerIntakeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dosePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dosePickerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Wheel Picker Modal (for dose picker)
  pickerModal: {
    borderWidth: 1,
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
  },
  pickerCancel: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerDone: {
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
    borderRadius: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
    fontSize: 22,
    fontWeight: '500',
  },
  wheelPickerTextActive: {
    fontSize: 24,
    fontWeight: '700',
  },
  pickerDirectInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 11,
    fontWeight: '600',
  },

  // Critical Toggle
  criticalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  criticalToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  criticalToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  criticalToggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
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
    fontSize: 13,
    fontWeight: '500',
  },
  ghostBtnDivider: {
    width: 1,
    height: 16,
  },
  pausedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pausedIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Refill Button
  doseHistoryCta: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  doseHistoryCtaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  doseHistoryCtaSub: {
    fontSize: 12,
    marginTop: 2,
  },
  refillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  refillBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  refillBtnStock: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Refill Modal
  refillModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  refillCurrentStock: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  refillCurrentStockLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  refillCurrentStockValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  refillQuickLabel: {
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
    borderWidth: 1,
    alignItems: 'center',
  },
  refillChipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  refillCustomLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  refillInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
  },
  refillPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  refillPreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  refillPreviewValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  refillConfirmBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  refillConfirmBtnDisabled: {
    opacity: 0.5,
  },
  refillConfirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
