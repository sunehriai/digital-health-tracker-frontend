import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronDown, ChevronUp, Minus, Plus, UtensilsCrossed, AlertTriangle, AlertCircle, ArrowUp, ArrowDown, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';
import TimeInput from '../components/TimeInput';
import DateInput from '../components/DateInput';
import type { RootStackScreenProps } from '../navigation/types';
import {
  FREQUENCY_TYPES,
  OCCURRENCE_OPTIONS,
  DAYS_OF_WEEK,
  MEAL_RELATIONS,
  MEAL_VALUES,
  DOSE_UNITS,
  MEDICATION_DEFAULTS,
  INVENTORY_CONFIG,
  VALIDATION,
  isLiquidUnit,
  getOccurrenceCount,
  type FrequencyType,
  type OccurrenceType,
  type DoseUnitType,
} from '../../domain/medicationConfig';
import { medicationService } from '../../data/services/medicationService';
import { useAIUpload } from '../../data/contexts/AIUploadContext';
import { ConfidenceBadge } from '../components/ai/ConfidenceIndicator';
import { ConfidenceLevel, getConfidenceLevel } from '../../domain/utils/confidenceUtils';
import { getLocalDateString } from '../../domain/utils/dateTimeUtils';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useGamification } from '../hooks/useGamification';
import { useAlert } from '../context/AlertContext';
import ScreenshotToast from '../components/ScreenshotToast';


export default function ManualMedicationEntryScreen({ navigation, route }: RootStackScreenProps<'ManualMedicationEntry'>) {
  const { colors, isDark } = useTheme();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('ManualMedicationEntry');
  const { refreshStatus } = useGamification();
  const { showAlert } = useAlert();
  const { prefs: { timeFormat, defaultDoseTime } } = useAppPreferences();
  // Get mode from route params - 'ai' mode means we're editing AI-extracted data
  const mode = route.params?.mode || 'manual';
  const isAIMode = mode === 'ai';

  // AI Upload context - provides form data when in AI mode
  const aiUpload = useAIUpload();
  const aiFormData = aiUpload.state.formData;
  const aiFieldConfidence = aiUpload.state.fieldConfidence;
  const aiFieldStatus = aiUpload.state.fieldStatus;
  const aiWarnings = aiUpload.state.warnings;

  // Helper to get initial value - from AI data if available, otherwise default
  const getInitialValue = <T,>(aiValue: T | undefined | null, defaultValue: T): T => {
    if (isAIMode && aiFormData && aiValue !== undefined && aiValue !== null) {
      return aiValue;
    }
    return defaultValue;
  };

  // Helper to get confidence level for a field
  const getFieldConfidence = (fieldName: string): ConfidenceLevel | null => {
    if (!isAIMode) return null;
    const confidence = aiFieldConfidence[fieldName];
    if (confidence === undefined) return null;
    return getConfidenceLevel(confidence);
  };

  // Basic Info - initialize from AI data when in AI mode
  const [name, setName] = useState(() => getInitialValue(aiFormData?.name, ''));
  const [isCritical, setIsCritical] = useState(() => getInitialValue(aiFormData?.isCritical, MEDICATION_DEFAULTS.isCritical));
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(() =>
    getInitialValue(aiFormData?.frequencyType, MEDICATION_DEFAULTS.frequencyType)
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    getInitialValue(aiFormData?.selectedDays, [])
  );
  const [intervalDays, setIntervalDays] = useState(() =>
    getInitialValue(aiFormData?.intervalDays, MEDICATION_DEFAULTS.intervalDays)
  );

  // Occurrence (Once/Twice/Thrice per day)
  const [occurrence, setOccurrence] = useState<OccurrenceType>(() =>
    getInitialValue(aiFormData?.occurrence, MEDICATION_DEFAULTS.occurrence)
  );
  const [doseIntervalHours, setDoseIntervalHours] = useState(() =>
    getInitialValue(aiFormData?.doseIntervalHours, MEDICATION_DEFAULTS.doseIntervalHours)
  );

  // Ritual Timeline
  const [startDate, setStartDate] = useState(() =>
    getInitialValue(aiFormData?.startDate, getLocalDateString())
  );
  const [endDate, setEndDate] = useState(() =>
    getInitialValue(aiFormData?.endDate, '') || ''
  );
  const [isOngoing, setIsOngoing] = useState(() =>
    getInitialValue(aiFormData?.isOngoing, MEDICATION_DEFAULTS.isOngoing)
  );

  // Timing & Context — Step 31: use user's default dose time preference unless AI-populated
  const [timeOfDay, setTimeOfDay] = useState(() =>
    getInitialValue(aiFormData?.timeOfDay, defaultDoseTime || MEDICATION_DEFAULTS.timeOfDay)
  );
  // Map meal relation string to index
  const getMealRelationIndex = (relation: string | undefined | null): number => {
    if (!relation) return 0;
    const idx = MEAL_VALUES.indexOf(relation as any);
    return idx >= 0 ? idx : 0;
  };
  const [mealRelationIndex, setMealRelationIndex] = useState(() =>
    getMealRelationIndex(aiFormData?.mealRelation)
  );

  // Calculated dose times based on occurrence and interval
  const calculatedDoseTimes = React.useMemo(() => {
    const times: string[] = [];
    const [startH, startM] = timeOfDay.split(':').map(Number);

    const occurrenceCount = getOccurrenceCount(occurrence);

    for (let i = 0; i < occurrenceCount; i++) {
      const totalMinutes = (startH * 60 + startM) + (i * doseIntervalHours * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const mins = totalMinutes % 60;
      times.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    }

    return times;
  }, [timeOfDay, occurrence, doseIntervalHours]);


  // Update interval when occurrence changes
  useEffect(() => {
    if (occurrence === 'twice') {
      setDoseIntervalHours(12);
    } else if (occurrence === 'thrice') {
      setDoseIntervalHours(8);
    }
  }, [occurrence]);

  // Reset occurrence when frequency changes to non-daily types
  useEffect(() => {
    if (frequencyType === 'interval' || frequencyType === 'as_needed') {
      setOccurrence('once');
    }
  }, [frequencyType]);

  // Volume Tracking
  const [doseSize, setDoseSize] = useState(() =>
    getInitialValue(aiFormData?.doseSize, MEDICATION_DEFAULTS.doseSize)
  );
  const [doseUnit, setDoseUnit] = useState<DoseUnitType>(() =>
    getInitialValue(aiFormData?.doseUnit, MEDICATION_DEFAULTS.doseUnit)
  );
  const [inventoryQuantity, setInventoryQuantity] = useState(() =>
    getInitialValue(aiFormData?.initialStock, MEDICATION_DEFAULTS.inventoryQuantity)
  );

  // Expiry Date
  const [expiryDate, setExpiryDate] = useState(() =>
    getInitialValue(aiFormData?.expiryDate, '') || ''
  );

  // Dose picker modal
  const [showDosePicker, setShowDosePicker] = useState(false);
  const [doseInputText, setDoseInputText] = useState('');

  // Inventory picker modal
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [inventoryInputText, setInventoryInputText] = useState('');

  // Medical Context (collapsible) - expand by default in AI mode if any medical fields have data
  const hasMedicalData = isAIMode && aiFormData && (
    aiFormData.strength || aiFormData.indication || aiFormData.specialInstructions ||
    aiFormData.allergies || aiFormData.doctorName || aiFormData.pharmacyName || aiFormData.brandName
  );
  const [medicalContextExpanded, setMedicalContextExpanded] = useState(hasMedicalData || false);
  const [strength, setStrength] = useState(() =>
    getInitialValue(aiFormData?.strength, '') || ''
  );
  const [indication, setIndication] = useState(() =>
    getInitialValue(aiFormData?.indication, '') || ''
  );
  const [specialInstructions, setSpecialInstructions] = useState(() =>
    getInitialValue(aiFormData?.specialInstructions, '') || ''
  );
  const [allergies, setAllergies] = useState(() =>
    getInitialValue(aiFormData?.allergies, '') || ''
  );
  const [doctorName, setDoctorName] = useState(() =>
    getInitialValue(aiFormData?.doctorName, '') || ''
  );
  const [pharmacyName, setPharmacyName] = useState(() =>
    getInitialValue(aiFormData?.pharmacyName, '') || ''
  );
  const [brandName, setBrandName] = useState(() =>
    getInitialValue(aiFormData?.brandName, '') || ''
  );

  // Calculate number of doses based on date range and frequency
  const calculateDosesForDateRange = (
    start: string,
    end: string,
    freqType: string,
    dose: number,
    days?: number[],
    interval?: number
  ): number => {
    const startD = new Date(start);
    const endD = new Date(end);
    const diffTime = endD.getTime() - startD.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end

    if (diffDays <= 0) return dose;

    switch (freqType) {
      case 'daily':
        return diffDays * dose;
      case 'specific_days': {
        if (!days || days.length === 0) return 0;
        // Count matching days in range
        let count = 0;
        const current = new Date(startD);
        while (current <= endD) {
          if (days.includes(current.getDay())) count++;
          current.setDate(current.getDate() + 1);
        }
        return count * dose;
      }
      case 'interval': {
        const actualInterval = interval || 2;
        return Math.ceil(diffDays / actualInterval) * dose;
      }
      case 'as_needed':
        // Can't calculate for as-needed, return a default estimate
        return dose;
      default:
        return diffDays * dose;
    }
  };

  // Auto-calculate inventory when end date is set
  useEffect(() => {
    if (!isOngoing && endDate && startDate && frequencyType !== 'as_needed') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end > start) {
        const calculatedDoses = calculateDosesForDateRange(
          startDate,
          endDate,
          frequencyType,
          doseSize,
          selectedDays,
          intervalDays
        );
        setInventoryQuantity(calculatedDoses);
      }
    }
  }, [endDate, startDate, frequencyType, selectedDays, intervalDays, doseSize, isOngoing]);

  // Validate and set end date
  const handleEndDateChange = (date: string) => {
    if (date && startDate) {
      const start = new Date(startDate);
      const end = new Date(date);
      if (end <= start) {
        const msg = 'End date must be after start date';
        showAlert({ title: 'Invalid Date', message: msg, type: 'warning' });
        return;
      }
    }
    setEndDate(date);
  };

  // Calculate expiry warning
  const getExpiryWarning = () => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { type: 'error' as const, message: 'This medication appears to be expired' };
    }
    if (daysUntilExpiry <= 30) {
      return { type: 'warning' as const, message: `This medication expires in ${daysUntilExpiry} days` };
    }
    if (daysUntilExpiry <= 90) {
      return { type: 'info' as const, message: `Expires in ${daysUntilExpiry} days` };
    }
    return null;
  };

  const expiryWarning = getExpiryWarning();

  // Check if form has any data entered (for discard confirmation)
  const hasFormData = () => {
    return (
      name.trim() !== '' ||
      strength.trim() !== '' ||
      indication.trim() !== '' ||
      specialInstructions.trim() !== '' ||
      allergies.trim() !== '' ||
      doctorName.trim() !== '' ||
      pharmacyName.trim() !== '' ||
      brandName.trim() !== '' ||
      inventoryQuantity !== 90 ||
      doseSize !== 1 ||
      timeOfDay !== '08:00' ||
      frequencyType !== 'daily' ||
      !isOngoing ||
      isCritical ||
      doseUnit !== 'tablets' ||
      expiryDate !== ''
    );
  };

  // Helper to determine if liquid medication for label display
  const isLiquidMedication = isLiquidUnit(doseUnit);

  // State for direct save (as-needed medications)
  const [isSaving, setIsSaving] = useState(false);

  // Handle close with discard confirmation
  const handleClose = () => {
    const closeAndReset = () => {
      if (isAIMode) {
        aiUpload.reset();
      }
      navigation.goBack();
    };

    if (hasFormData()) {
      showAlert({
        title: 'Discard Changes?',
        message: 'Any unsaved data will be lost.',
        type: 'destructive',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep Editing',
        onConfirm: closeAndReset,
      });
    } else {
      closeAndReset();
    }
  };

  // Direct save for as-needed medications (bypasses RitualPreview)
  const handleDirectSave = async () => {
    if (!name.trim()) {
      const msg = VALIDATION.name.errorMessage;
      showAlert({ title: 'Required', message: msg, type: 'warning' });
      return;
    }

    if (inventoryQuantity <= 0) {
      const msg = VALIDATION.stock.errorMessage;
      showAlert({ title: 'Invalid Stock', message: msg, type: 'warning' });
      return;
    }

    setIsSaving(true);
    try {
      // Use current time for time_of_day since as-needed meds don't have scheduled times
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      await medicationService.create({
        name: name.trim(),
        strength: strength.trim() || null,
        frequency: 'daily', // Default frequency, but is_as_needed flag is what matters
        custom_days: null,
        start_date: startDate,
        end_date: !isOngoing && endDate ? endDate : null,
        is_ongoing: isOngoing,
        time_of_day: currentTime,
        dose_times: null, // No scheduled dose times for as-needed
        occurrence: 'once',
        dose_interval_hours: null,
        meal_relation: MEAL_VALUES[mealRelationIndex],
        dose_size: doseSize,
        dose_unit: doseUnit,
        initial_stock: inventoryQuantity,
        current_stock: inventoryQuantity,
        indication: indication.trim() || null,
        special_instructions: specialInstructions.trim() || null,
        allergies: allergies.trim() || null,
        doctor_name: doctorName.trim() || null,
        pharmacy_name: pharmacyName.trim() || null,
        brand_name: brandName.trim() || null,
        is_critical: isCritical,
        is_as_needed: true,
        expiry_date: expiryDate || null,
        // AI tracking fields
        entry_mode: isAIMode ? 'ai_scan' : 'manual',
        ai_confidence_score: isAIMode ? aiUpload.state.averageConfidence : null,
        requires_review: isAIMode ? aiUpload.state.flaggedForReview : false,
      });

      // Refresh gamification status (XP may have been awarded for first medication)
      await refreshStatus();

      // Reset AI context if we were in AI mode
      if (isAIMode) {
        aiUpload.reset();
      }

      // Navigate directly to Cabinet after save
      navigation.navigate('MainTabs', { screen: 'Cabinet' });
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to save medication';
      showAlert({ title: 'Error', message: errorMsg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      const msg = VALIDATION.name.errorMessage;
      showAlert({ title: 'Required', message: msg, type: 'warning' });
      return;
    }

    // Validate stock is greater than 0
    if (inventoryQuantity <= 0) {
      const msg = VALIDATION.stock.errorMessage;
      showAlert({ title: 'Invalid Stock', message: msg, type: 'warning' });
      return;
    }

    // Validate specific days selection
    if (frequencyType === 'specific_days' && selectedDays.length === 0) {
      const msg = VALIDATION.specificDays.errorMessage;
      showAlert({ title: 'Required', message: msg, type: 'warning' });
      return;
    }

    // Validate end date is required when not ongoing
    if (!isOngoing && !endDate) {
      const msg = VALIDATION.endDate.requiredMessage;
      showAlert({ title: 'Required', message: msg, type: 'warning' });
      return;
    }

    // Validate end date is after start date
    if (!isOngoing && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        const msg = VALIDATION.endDate.errorMessage;
        showAlert({ title: 'Invalid Date', message: msg, type: 'warning' });
        return;
      }
    }

    // Determine the frequency value for the backend
    let frequencyValue: string;
    let customDays: number[] | null = null;

    switch (frequencyType) {
      case 'daily':
        frequencyValue = 'daily';
        break;
      case 'specific_days':
        frequencyValue = 'custom';
        customDays = selectedDays;
        break;
      case 'interval':
        frequencyValue = 'every_other_day'; // We'll use this for interval-based
        // Store interval in custom_days as a special indicator
        customDays = [-intervalDays]; // Negative to indicate interval
        break;
      case 'as_needed':
        frequencyValue = 'daily'; // Default, but medication won't have scheduled alarms
        break;
      default:
        frequencyValue = 'daily';
    }

    // Navigate to Ritual Preview screen with all data (save happens there)
    console.log('ManualEntry: Navigating with isCritical =', isCritical, 'occurrence =', occurrence, 'isAIMode =', isAIMode);
    navigation.navigate('RitualPreview', {
      name: name.trim(),
      strength: strength.trim() || null,
      frequency: frequencyValue,
      customDays,
      startDate,
      endDate: !isOngoing && endDate ? endDate : null,
      isOngoing,
      timeOfDay,
      doseTimes: calculatedDoseTimes,
      occurrence,
      doseIntervalHours: occurrence !== 'once' ? doseIntervalHours : null,
      mealRelation: MEAL_VALUES[mealRelationIndex],
      doseSize,
      doseUnit,
      initialStock: inventoryQuantity,
      indication: indication.trim() || null,
      specialInstructions: specialInstructions.trim() || null,
      allergies: allergies.trim() || null,
      doctorName: doctorName.trim() || null,
      pharmacyName: pharmacyName.trim() || null,
      brandName: brandName.trim() || null,
      isCritical,
      expiryDate: expiryDate || null,
      // AI tracking fields
      entryMode: isAIMode ? 'ai_scan' : 'manual',
      aiConfidenceScore: isAIMode ? aiUpload.state.averageConfidence : null,
      requiresReview: isAIMode ? aiUpload.state.flaggedForReview : false,
    });

    // Reset AI context after navigating (will be saved in RitualPreview)
    if (isAIMode) {
      aiUpload.reset();
    }
  };

  // Max dose varies by unit type
  const getMaxDoseForUnit = (unit: DoseUnitType): number => {
    switch (unit) {
      case 'tablets': return 10;
      case 'capsules': return 10;
      case 'mL': return 50;
      case 'tsp': return 10;
      default: return 10;
    }
  };

  const maxDoseSize = getMaxDoseForUnit(doseUnit);

  // Reset dose size if it exceeds max when unit changes
  useEffect(() => {
    if (doseSize > maxDoseSize) {
      setDoseSize(maxDoseSize);
    }
  }, [doseUnit, maxDoseSize]);

  const incrementDose = () => setDoseSize((prev) => Math.min(maxDoseSize, prev + 1));
  const decrementDose = () => setDoseSize((prev) => Math.max(1, prev - 1));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: `${colors.cyan}1A` }]}>
            <X color={colors.cyan} size={24} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{isAIMode ? 'Review Details' : 'Manual Entry'}</Text>
            {isAIMode && (
              <View style={[styles.aiModeBadge, { backgroundColor: `${colors.cyan}1A` }]}>
                <Sparkles size={12} color={colors.cyan} />
                <Text style={[styles.aiModeBadgeText, { color: colors.cyan }]}>AI-Assisted</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* AI Warnings Banner */}
        {isAIMode && aiWarnings.length > 0 && (
          <View style={styles.warningsBanner}>
            {aiWarnings.map((warning, index) => (
              <View key={index} style={styles.warningRow}>
                <AlertCircle size={14} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* MEDICATION NAME */}
        <View style={styles.labelWithConfidence}>
          <Text style={[styles.sectionLabel, { color: colors.cyan }]}>MEDICATION NAME</Text>
          {getFieldConfidence('name') && (
            <ConfidenceBadge level={getFieldConfidence('name')!} />
          )}
        </View>
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
            isAIMode && getFieldConfidence('name') === 'low' && styles.inputLowConfidence,
            isAIMode && getFieldConfidence('name') === 'medium' && styles.inputMediumConfidence,
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Enter medication name"
          placeholderTextColor={colors.textMuted}
        />

        {/* Critical Toggle - Highly visible right after name */}
        <TouchableOpacity
          style={[styles.criticalToggle, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }, isCritical && styles.criticalToggleActive]}
          onPress={() => setIsCritical(!isCritical)}
          activeOpacity={0.7}
        >
          <View style={styles.criticalToggleLeft}>
            <View style={[styles.criticalIconBg, { backgroundColor: colors.bgSubtle }, isCritical && styles.criticalIconBgActive]}>
              <AlertTriangle color={isCritical ? "#FB7185" : colors.textMuted} size={18} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={[styles.criticalLabel, { color: colors.textSecondary }, isCritical && styles.criticalLabelActive]}>Critical Medication</Text>
              <Text style={[styles.criticalHint, { color: colors.textMuted }]}>Essential - never skip this one</Text>
            </View>
          </View>
          <View style={[styles.toggleSwitch, { backgroundColor: isDark ? '#1E293B' : '#D1D5DB' }, isCritical && styles.toggleSwitchActive]}>
            <View style={[styles.toggleKnob, { backgroundColor: colors.textMuted }, isCritical && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        {/* SCHEDULE */}
        <Text style={[styles.sectionLabel, { color: colors.cyan }]}>SCHEDULE</Text>
        {frequencyType === 'as_needed' ? (
          /* As-needed: Only show Start Date (full width) */
          <DateInput
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            placeholder="Select date"
          />
        ) : (
          /* Scheduled: Show both Start Date and Start Time */
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeHalf}>
              <DateInput
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                placeholder="Select date"
              />
            </View>
            <View style={styles.dateTimeHalf}>
              <TimeInput
                label="Start Time"
                value={timeOfDay}
                onChange={setTimeOfDay}
                placeholder="Select time"
              />
            </View>
          </View>
        )}

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Ongoing Ritual</Text>
          <Switch
            value={isOngoing}
            onValueChange={setIsOngoing}
            trackColor={{ false: isDark ? '#1E293B' : '#D1D5DB', true: colors.cyan }}
            thumbColor={isOngoing ? '#FFFFFF' : colors.textSecondary}
            ios_backgroundColor={isDark ? '#1E293B' : '#D1D5DB'}
          />
        </View>

        {/* End Date - only show when not ongoing */}
        {!isOngoing && (
          <View style={styles.fieldMargin}>
            <DateInput
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              placeholder="Select end date"
            />
            {endDate && startDate && new Date(endDate) > new Date(startDate) && (
              <Text style={[styles.calculatedInfo, { color: colors.cyan }]}>
                Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </Text>
            )}
          </View>
        )}

        {/* FREQUENCY PATTERN */}
        <Text style={[styles.sectionLabel, { color: colors.cyan }]}>FREQUENCY PATTERN</Text>
        <View style={styles.frequencyGrid}>
          {FREQUENCY_TYPES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[styles.frequencyGridOption, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }, frequencyType === freq.value && { backgroundColor: `${colors.cyan}1A`, borderColor: colors.cyan }]}
              onPress={() => setFrequencyType(freq.value as typeof frequencyType)}
            >
              <View style={[styles.radioOuter, { borderColor: colors.textMuted }, frequencyType === freq.value && styles.radioOuterActive, frequencyType === freq.value && { borderColor: colors.cyan }]}>
                {frequencyType === freq.value && <View style={[styles.radioInner, { backgroundColor: colors.cyan }]} />}
              </View>
              <Text style={[styles.frequencyGridText, { color: colors.textSecondary }, frequencyType === freq.value && styles.frequencyGridTextActive, frequencyType === freq.value && { color: colors.textPrimary }]}>
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Day selector for "On specific days" */}
        {frequencyType === 'specific_days' && (
          <View style={[styles.daySelector, { backgroundColor: colors.bgDark, borderColor: `${colors.cyan}33` }]}>
            <Text style={[styles.daySelectorLabel, { color: colors.textSecondary }]}>Select days:</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayChip,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle },
                    selectedDays.includes(day.value) && { backgroundColor: `${colors.cyan}33`, borderColor: colors.cyan },
                  ]}
                  onPress={() => {
                    if (selectedDays.includes(day.value)) {
                      setSelectedDays(selectedDays.filter((d) => d !== day.value));
                    } else {
                      setSelectedDays([...selectedDays, day.value]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: colors.textMuted },
                      selectedDays.includes(day.value) && styles.dayChipTextActive,
                      selectedDays.includes(day.value) && { color: colors.cyan },
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedDays.length > 0 && (
              <Text style={[styles.selectedDaysInfo, { color: colors.cyan }]}>
                {selectedDays
                  .sort((a, b) => a - b)
                  .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.full)
                  .join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Interval input for "Every X days" */}
        {frequencyType === 'interval' && (
          <View style={[styles.intervalSelector, { backgroundColor: colors.bgDark, borderColor: `${colors.cyan}33` }]}>
            <Text style={[styles.intervalLabel, { color: colors.textPrimary }]}>Every</Text>
            <View style={styles.intervalStepper}>
              <TouchableOpacity
                style={[styles.intervalBtn, { backgroundColor: `${colors.cyan}26` }]}
                onPress={() => setIntervalDays(Math.max(2, intervalDays - 1))}
              >
                <Minus color={colors.cyan} size={16} strokeWidth={3} />
              </TouchableOpacity>
              <Text style={[styles.intervalValue, { color: colors.cyan }]}>{intervalDays}</Text>
              <TouchableOpacity
                style={[styles.intervalBtn, { backgroundColor: `${colors.cyan}26` }]}
                onPress={() => setIntervalDays(intervalDays + 1)}
              >
                <Plus color={colors.cyan} size={16} strokeWidth={3} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.intervalLabel, { color: colors.textPrimary }]}>days</Text>
          </View>
        )}

        {/* Info message for "As needed" */}
        {frequencyType === 'as_needed' && (
          <View style={[styles.asNeededInfo]}>
            <Text style={[styles.asNeededText, { color: colors.textSecondary }]}>
              This medication will be available to log anytime without scheduled reminders.
            </Text>
          </View>
        )}

        {/* DAILY OCCURRENCE - Only show for Daily or Specific Days */}
        {(frequencyType === 'daily' || frequencyType === 'specific_days') && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.cyan }]}>DAILY OCCURRENCE</Text>
            <View style={styles.occurrenceRow}>
              {OCCURRENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.occurrenceChip,
                    { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle },
                    occurrence === opt.value && { backgroundColor: `${colors.cyan}26`, borderColor: colors.cyan },
                  ]}
                  onPress={() => setOccurrence(opt.value as typeof occurrence)}
                >
                  <Text
                    style={[
                      styles.occurrenceText,
                      { color: colors.textSecondary },
                      occurrence === opt.value && styles.occurrenceTextActive,
                      occurrence === opt.value && { color: colors.cyan },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interval Slider - Only show for Twice or Thrice */}
            {occurrence !== 'once' && (
              <View style={[styles.intervalSliderContainer, { backgroundColor: colors.bgDark, borderColor: `${colors.cyan}33` }]}>
                <Text style={[styles.intervalSliderLabel, { color: colors.textPrimary }]}>
                  Interval: Every <Text style={[styles.intervalValue, { color: colors.cyan }]}>{doseIntervalHours}</Text> hours
                </Text>
                <View style={styles.intervalSliderRow}>
                  <Text style={[styles.intervalMinMax, { color: colors.textMuted }]}>4h</Text>
                  <View style={styles.sliderTrack}>
                    {[4, 6, 8, 10, 12].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.sliderDot,
                          { backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle },
                          doseIntervalHours === val && { backgroundColor: `${colors.cyan}33`, borderColor: colors.cyan },
                        ]}
                        onPress={() => setDoseIntervalHours(val)}
                      >
                        <Text style={[
                          styles.sliderDotLabel,
                          { color: colors.textMuted },
                          doseIntervalHours === val && styles.sliderDotLabelActive,
                          doseIntervalHours === val && { color: colors.cyan },
                        ]}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.intervalMinMax, { color: colors.textMuted }]}>12h</Text>
                </View>
              </View>
            )}

            {/* Calculated Doses Display - Only show for Twice/Thrice */}
            {occurrence !== 'once' && calculatedDoseTimes.length > 0 && (
              <View style={[styles.calculatedDosesContainer, { backgroundColor: `${colors.cyan}14`, borderColor: `${colors.cyan}33` }]}>
                <Text style={[styles.calculatedDosesLabel, { color: colors.cyan }]}>SCHEDULED DOSES</Text>
                <View style={styles.calculatedDosesList}>
                  {calculatedDoseTimes.map((time, index) => (
                    <View key={index} style={[styles.calculatedDoseItem, { backgroundColor: `${colors.cyan}1A` }]}>
                      <View style={[styles.doseNumberBadge, { backgroundColor: colors.cyan }]}>
                        <Text style={[styles.doseNumberText, { color: isDark ? '#0A0A0B' : '#FFFFFF' }]}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.calculatedDoseTime, { color: colors.textPrimary }]}>
                        {formatTime(time, timeFormat)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* VOLUME TRACKING */}
        <Text style={[styles.sectionLabel, { color: colors.cyan }]}>VOLUME TRACKING</Text>
        <View style={[styles.dosePerIntakeRow, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.stepperLabelSmall, { color: colors.textPrimary }]}>Dose per intake</Text>
          <TouchableOpacity
            style={[styles.dosePickerButton, { backgroundColor: `${colors.cyan}1A` }]}
            onPress={() => setShowDosePicker(true)}
          >
            <Text style={[styles.dosePickerButtonText, { color: colors.cyan }]}>{doseSize}</Text>
            <ChevronDown color={colors.cyan} size={16} />
          </TouchableOpacity>
        </View>

        {/* Dose Picker Modal */}
        {showDosePicker && (
          <View style={[styles.pickerModal, { backgroundColor: colors.bgDark, borderColor: `${colors.cyan}4D` }]}>
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
              <View style={[styles.wheelPickerHighlight, { backgroundColor: `${colors.cyan}1A`, borderColor: `${colors.cyan}4D` }]} />
              <ScrollView
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentContainerStyle={styles.wheelPickerContent}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.y / 50);
                  setDoseSize(Math.min(maxDoseSize, Math.max(1, index + 1)));
                }}
              >
                {Array.from({ length: maxDoseSize }, (_, i) => i + 1).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.wheelPickerItem}
                    onPress={() => setDoseSize(num)}
                  >
                    <Text
                      style={[
                        styles.wheelPickerText,
                        { color: colors.textMuted },
                        doseSize === num && styles.wheelPickerTextActive,
                        doseSize === num && { color: colors.cyan },
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
              onFocus={() => setDoseInputText(doseSize.toString())}
              onChangeText={(text) => {
                // Allow only numbers
                const numericText = text.replace(/[^0-9]/g, '');
                setDoseInputText(numericText);
              }}
              onBlur={() => {
                const val = parseInt(doseInputText, 10);
                if (!isNaN(val) && val >= 1 && val <= maxDoseSize) {
                  setDoseSize(val);
                } else if (!isNaN(val) && val > maxDoseSize) {
                  setDoseSize(maxDoseSize);
                }
                setDoseInputText('');
              }}
              onSubmitEditing={() => {
                const val = parseInt(doseInputText, 10);
                if (!isNaN(val) && val >= 1 && val <= maxDoseSize) {
                  setDoseSize(val);
                } else if (!isNaN(val) && val > maxDoseSize) {
                  setDoseSize(maxDoseSize);
                }
                setDoseInputText('');
              }}
              keyboardType="number-pad"
              placeholder={`Enter value (1-${maxDoseSize})`}
              placeholderTextColor={colors.textMuted}
              maxLength={2}
            />
          </View>
        )}

        {/* Dose Unit Selector */}
        <View style={styles.unitChipGroup}>
          {DOSE_UNITS.map((unit) => (
            <TouchableOpacity
              key={unit.value}
              style={[styles.unitChip, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }, doseUnit === unit.value && { backgroundColor: `${colors.cyan}26`, borderColor: colors.cyan }]}
              onPress={() => setDoseUnit(unit.value as typeof doseUnit)}
            >
              <Text style={[styles.unitChipText, { color: colors.textSecondary }, doseUnit === unit.value && styles.unitChipTextActive, doseUnit === unit.value && { color: colors.cyan }]}>
                {unit.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.dosePerIntakeRow, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.stepperLabelSmall, { color: colors.textPrimary }]}>Inventory in stock</Text>
          <TouchableOpacity
            style={[styles.dosePickerButton, { backgroundColor: `${colors.cyan}1A` }]}
            onPress={() => setShowInventoryPicker(true)}
          >
            <Text style={[styles.dosePickerButtonText, { color: colors.cyan }]}>{inventoryQuantity}</Text>
            <ChevronDown color={colors.cyan} size={16} />
          </TouchableOpacity>
        </View>

        {/* Inventory Picker Modal */}
        {showInventoryPicker && (
          <View style={[styles.pickerModal, { backgroundColor: colors.bgDark, borderColor: `${colors.cyan}4D` }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.borderSubtle }]}>
              <TouchableOpacity onPress={() => setShowInventoryPicker(false)}>
                <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Inventory in stock</Text>
              <TouchableOpacity onPress={() => setShowInventoryPicker(false)}>
                <Text style={[styles.pickerDone, { color: colors.cyan }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelPickerContainer}>
              <View style={[styles.wheelPickerHighlight, { backgroundColor: `${colors.cyan}1A`, borderColor: `${colors.cyan}4D` }]} />
              <ScrollView
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                contentContainerStyle={styles.wheelPickerContent}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.y / 50);
                  setInventoryQuantity(Math.max(1, index + 1));
                }}
              >
                {Array.from({ length: 200 }, (_, i) => i + 1).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.wheelPickerItem}
                    onPress={() => setInventoryQuantity(num)}
                  >
                    <Text
                      style={[
                        styles.wheelPickerText,
                        { color: colors.textMuted },
                        inventoryQuantity === num && styles.wheelPickerTextActive,
                        inventoryQuantity === num && { color: colors.cyan },
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
              value={inventoryInputText}
              onFocus={() => setInventoryInputText(inventoryQuantity.toString())}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '');
                setInventoryInputText(numericText);
              }}
              onBlur={() => {
                const val = parseInt(inventoryInputText, 10);
                if (!isNaN(val) && val >= 1) {
                  setInventoryQuantity(val);
                }
                setInventoryInputText('');
              }}
              onSubmitEditing={() => {
                const val = parseInt(inventoryInputText, 10);
                if (!isNaN(val) && val >= 1) {
                  setInventoryQuantity(val);
                }
                setInventoryInputText('');
                setShowInventoryPicker(false);
              }}
              keyboardType="number-pad"
              placeholder="Enter quantity"
              placeholderTextColor={colors.textMuted}
              maxLength={4}
            />
          </View>
        )}

        {/* Expiry Date Picker */}
        <View style={styles.fieldMargin}>
          <DateInput
            label="Expiry Date (Optional)"
            value={expiryDate}
            onChange={setExpiryDate}
            placeholder="Select expiry date"
          />
          {expiryWarning && (
            <View style={[
              styles.expiryWarning,
              expiryWarning.type === 'error' && styles.expiryError,
            ]}>
              <AlertCircle
                color={expiryWarning.type === 'error' ? colors.error : colors.warning}
                size={16}
              />
              <Text style={[
                styles.expiryWarningText,
                expiryWarning.type === 'error' && styles.expiryErrorText,
              ]}>
                {expiryWarning.message}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Meal Relation</Text>
        <View style={styles.chipGroup}>
          {MEAL_RELATIONS.map((m, index) => (
            <TouchableOpacity
              key={m}
              style={[styles.mealChip, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }, mealRelationIndex === index && { backgroundColor: `${colors.cyan}26`, borderColor: colors.cyan }]}
              onPress={() => setMealRelationIndex(index)}
            >
              {index > 0 && (
                <UtensilsCrossed
                  color={mealRelationIndex === index ? colors.cyan : colors.textMuted}
                  size={14}
                  strokeWidth={2}
                />
              )}
              <Text style={[styles.chipText, { color: colors.textSecondary }, mealRelationIndex === index && styles.chipTextActive, mealRelationIndex === index && { color: colors.cyan }]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MEDICAL CONTEXT (KNOWLEDGE BASE) - Collapsible */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
          onPress={() => setMedicalContextExpanded(!medicalContextExpanded)}
        >
          <Text style={[styles.collapsibleTitle, { color: colors.cyan }]}>MEDICAL CONTEXT (KNOWLEDGE BASE)</Text>
          {medicalContextExpanded ? (
            <ChevronUp color={colors.cyan} size={20} />
          ) : (
            <ChevronDown color={colors.cyan} size={20} />
          )}
        </TouchableOpacity>

        {medicalContextExpanded && (
          <View style={styles.collapsibleContent}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Strength/Unit</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={strength}
              onChangeText={setStrength}
              placeholder="e.g., 20mg"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Indication (Health Goal)</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={indication}
              onChangeText={setIndication}
              placeholder="e.g., Longevity, Heart Health"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              placeholder="Take with water, avoid alcohol..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Specific Allergies</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="Sulfa drugs, penicillin..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Doctor Name</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="Dr. Smith"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pharmacy Name</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={pharmacyName}
              onChangeText={setPharmacyName}
              placeholder="CVS Pharmacy"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Brand Name</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
              value={brandName}
              onChangeText={setBrandName}
              placeholder="Generic / Brand name"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        {/* Save Button - "ADD TO CABINET" for as-needed, "INITIALIZE RITUAL" for others */}
        <TouchableOpacity
          style={[styles.initializeBtn, { backgroundColor: colors.cyan }, (!name.trim() || isSaving) && styles.initializeBtnDisabled]}
          onPress={frequencyType === 'as_needed' ? handleDirectSave : handleSave}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#0A0A0B'} />
              <Text style={[styles.initializeBtnText, { color: isDark ? '#0A0A0B' : '#FFFFFF' }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={[styles.initializeBtnText, { color: isDark ? '#0A0A0B' : '#FFFFFF' }]}>
              {frequencyType === 'as_needed' ? 'ADD TO CABINET' : 'INITIALIZE RITUAL'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
  },
  aiModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  aiModeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  warningsBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  labelWithConfidence: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  fieldMargin: {
    marginTop: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeHalf: {
    flex: 1,
  },
  calculatedInfo: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // AI Mode confidence-based input styling
  inputLowConfidence: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputMediumConfidence: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },

  // Frequency Type Selection - 2x2 Grid
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyGridOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  frequencyGridOptionActive: {
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  frequencyGridText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  frequencyGridTextActive: {
  },

  // Day Selector (for specific days)
  daySelector: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  daySelectorLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayChipActive: {
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayChipTextActive: {
  },
  selectedDaysInfo: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },

  // Interval Selector (for every X days)
  intervalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  intervalLabel: {
    fontSize: 16,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalValue: {
    fontSize: 24,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },

  // As Needed Info
  asNeededInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.2)',
  },
  asNeededText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Occurrence Chips (Once/Twice/Thrice)
  occurrenceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  occurrenceChip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  occurrenceChipActive: {
  },
  occurrenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  occurrenceTextActive: {
  },

  // Interval Slider
  intervalSliderContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  intervalSliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  intervalSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intervalMinMax: {
    fontSize: 12,
    fontWeight: '600',
    width: 28,
  },
  sliderTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sliderDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderDotActive: {
  },
  sliderDotLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  sliderDotLabelActive: {
  },

  // Calculated Doses Display
  calculatedDosesContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  calculatedDosesLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  calculatedDosesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  calculatedDoseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  doseNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  calculatedDoseTime: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Chips
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Stepper
  stepperContainer: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  stepperLabelSmall: {
    fontSize: 13,
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  stepperValueSmall: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },

  // Dose per intake row
  dosePerIntakeRow: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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

  // Wheel Picker Modal
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

  // Inventory stepper value input
  stepperValueInput: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
    padding: 0,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Collapsible
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  collapsibleTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  collapsibleContent: {
    paddingTop: 8,
  },

  // Initialize Button
  initializeBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  initializeBtnDisabled: {
    opacity: 0.5,
  },
  initializeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Critical Toggle
  criticalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  criticalToggleActive: {
    borderColor: 'rgba(251, 113, 133, 0.4)',
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
  },
  criticalToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  criticalIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalIconBgActive: {
    backgroundColor: 'rgba(251, 113, 133, 0.15)',
  },
  criticalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  criticalLabelActive: {
    color: '#FB7185',
  },
  criticalHint: {
    fontSize: 11,
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

  // Unit Chip Styles
  unitChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  unitChipActive: {
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  unitChipTextActive: {
  },

  // Inventory Hint
  inventoryHint: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Expiry Warning Styles
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  expiryWarningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    color: '#F59E0B',
  },
  expiryError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  expiryErrorText: {
    color: '#EF4444',
  },
});
