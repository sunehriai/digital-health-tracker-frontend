/**
 * Medication Field Configuration
 *
 * Single source of truth for all medication-related field definitions.
 * Used by ManualMedicationEntryScreen, CabinetScreen, and MedicationDetailsScreen.
 */

// ============================================================================
// FREQUENCY OPTIONS
// ============================================================================

export const FREQUENCY_TYPES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Specific Days', value: 'specific_days' },
  { label: 'Every X Days', value: 'interval' },
  { label: 'As Needed', value: 'as_needed' },
] as const;

export const FREQUENCY_OPTIONS_EDIT = [
  { value: 'daily', label: 'Daily' },
  { value: 'custom', label: 'Specific Days' },
  { value: 'every_other_day', label: 'Every X Days' },
  { value: 'as_needed', label: 'As Needed' },
] as const;

// Frequency options for alarm modal - excludes 'as_needed' since as-needed meds
// don't have scheduled alarms (they're saved directly to cabinet without reminders)
export const ALARM_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'custom', label: 'Specific Days' },
  { value: 'every_other_day', label: 'Every X Days' },
] as const;

export type FrequencyType = 'daily' | 'specific_days' | 'interval' | 'as_needed';
export type BackendFrequencyType = 'daily' | 'every_other_day' | 'mon_fri' | 'custom';

// ============================================================================
// OCCURRENCE OPTIONS (Once/Twice/Thrice per day)
// ============================================================================

export const OCCURRENCE_OPTIONS = [
  { label: 'Once', value: 'once', defaultInterval: 0 },
  { label: 'Twice', value: 'twice', defaultInterval: 12 },
  { label: 'Thrice', value: 'thrice', defaultInterval: 8 },
] as const;

export type OccurrenceType = 'once' | 'twice' | 'thrice';

// ============================================================================
// DAYS OF WEEK
// ============================================================================

export const DAYS_OF_WEEK = [
  { short: 'Mon', full: 'Monday', value: 1 },
  { short: 'Tue', full: 'Tuesday', value: 2 },
  { short: 'Wed', full: 'Wednesday', value: 3 },
  { short: 'Thu', full: 'Thursday', value: 4 },
  { short: 'Fri', full: 'Friday', value: 5 },
  { short: 'Sat', full: 'Saturday', value: 6 },
  { short: 'Sun', full: 'Sunday', value: 0 },
] as const;

export const DAYS_OF_WEEK_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// MEAL RELATION OPTIONS
// ============================================================================

export const MEAL_RELATIONS = ['None', 'Before', 'With', 'After'] as const;
export const MEAL_VALUES = ['none', 'before', 'with', 'after'] as const;

export const MEAL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'before', label: 'Before' },
  { value: 'with', label: 'With' },
  { value: 'after', label: 'After' },
] as const;

export type MealRelationType = 'none' | 'before' | 'with' | 'after';

// ============================================================================
// DOSE UNIT OPTIONS
// ============================================================================

export const DOSE_UNITS = [
  { label: 'Tablets', value: 'tablets' },
  { label: 'Capsules', value: 'capsules' },
  { label: 'mL', value: 'mL' },
  { label: 'tsp', value: 'tsp' },
] as const;

export type DoseUnitType = 'tablets' | 'capsules' | 'mL' | 'tsp';

// Liquid units for conditional display
export const LIQUID_UNITS: DoseUnitType[] = ['mL', 'tsp'];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const MEDICATION_DEFAULTS: {
  doseSize: number;
  inventoryQuantity: number;
  timeOfDay: string;
  frequencyType: FrequencyType;
  occurrence: OccurrenceType;
  doseUnit: DoseUnitType;
  mealRelation: MealRelationType;
  intervalDays: number;
  doseIntervalHours: number;
  isOngoing: boolean;
  isCritical: boolean;
} = {
  doseSize: 1,
  inventoryQuantity: 90,
  timeOfDay: '08:00',
  frequencyType: 'daily',
  occurrence: 'once',
  doseUnit: 'tablets',
  mealRelation: 'none',
  intervalDays: 2,
  doseIntervalHours: 12,
  isOngoing: true,
  isCritical: false,
};

// ============================================================================
// INVENTORY FIELD CONFIGURATION
// ============================================================================

/**
 * Get abbreviated dose unit for compact display
 * e.g., "tablets" → "tabs", "capsules" → "caps"
 */
export function abbreviateDoseUnit(doseUnit: DoseUnitType | string | null): string {
  switch (doseUnit) {
    case 'tablets': return 'tabs';
    case 'capsules': return 'caps';
    case 'mL': return 'mL';
    case 'tsp': return 'tsp';
    default: return doseUnit || 'doses';
  }
}

export const INVENTORY_CONFIG = {
  /**
   * Get the label for the inventory field based on dose unit
   */
  getLabel: (doseUnit: DoseUnitType): string => {
    return isLiquidUnit(doseUnit) ? 'Total Volume' : 'Current Inventory';
  },

  /**
   * Get the hint text for the inventory field
   */
  getHint: (doseUnit: DoseUnitType, doseSize: number): string => {
    if (isLiquidUnit(doseUnit)) {
      return `Total volume in ${doseUnit} (reduces by ${doseSize} ${doseUnit} per dose)`;
    }
    return `Number of ${doseUnit} in stock (reduces by ${doseSize} per dose)`;
  },

  /**
   * Format stock display for Cabinet/Details screens
   * e.g., "67/90 tabs" or "495/500 mL"
   */
  formatStockDisplay: (currentStock: number, initialStock: number, doseUnit: DoseUnitType | string | null): string => {
    const abbrev = abbreviateDoseUnit(doseUnit);
    return `${currentStock}/${initialStock} ${abbrev}`;
  },

  /**
   * Format stock for refill modal subtitle
   */
  formatRefillSubtitle: (name: string, currentStock: number, doseUnit: DoseUnitType | string | null): string => {
    return `${name} • Current: ${currentStock} ${doseUnit || 'doses'}`;
  },
} as const;

// ============================================================================
// DOSE SIZE FIELD CONFIGURATION
// ============================================================================

export const DOSE_SIZE_CONFIG = {
  min: 1,
  stepperIncrement: 1,

  /**
   * Format dose info for display
   * e.g., "1 tablet" or "2 capsules"
   */
  formatDoseInfo: (doseSize: number, doseUnit: DoseUnitType | string): string => {
    return `${doseSize} ${doseUnit}`;
  },
} as const;

// ============================================================================
// STOCK LEVEL THRESHOLDS
// ============================================================================

export const STOCK_THRESHOLDS = {
  critical: 5,      // Very low - pulsing animation
  low: 10,          // Low - percentage based warning
  lowPercent: 20,   // Below 20% is considered low
  veryLowPercent: 10, // Below 10% is critical
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  name: {
    required: true,
    minLength: 1,
    errorMessage: 'Medication name is required',
  },
  stock: {
    min: 1,
    errorMessage: 'Initial stock must be greater than 0',
  },
  specificDays: {
    minSelection: 1,
    errorMessage: 'Please select at least one day',
  },
  endDate: {
    errorMessage: 'End date must be after start date',
    requiredMessage: 'End date is required when not ongoing',
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a dose unit is a liquid unit (mL or tsp)
 */
export function isLiquidUnit(doseUnit: DoseUnitType | string | null): boolean {
  return doseUnit === 'mL' || doseUnit === 'tsp';
}

/**
 * Get the default dose interval hours for an occurrence type
 */
export function getDefaultIntervalForOccurrence(occurrence: OccurrenceType): number {
  const option = OCCURRENCE_OPTIONS.find(o => o.value === occurrence);
  return option?.defaultInterval || 0;
}

/**
 * Get occurrence count from occurrence type
 */
export function getOccurrenceCount(occurrence: OccurrenceType): number {
  switch (occurrence) {
    case 'once': return 1;
    case 'twice': return 2;
    case 'thrice': return 3;
    default: return 1;
  }
}

/**
 * Map UI frequency type to backend frequency value
 */
export function toBackendFrequency(freq: string): BackendFrequencyType {
  switch (freq) {
    case 'specific_days':
    case 'custom':
      return 'custom';
    case 'interval':
    case 'every_other_day':
      return 'every_other_day';
    case 'as_needed':
      return 'custom'; // as_needed maps to custom on backend
    default:
      return 'daily';
  }
}

/**
 * Format frequency for display
 */
export function formatFrequencyDisplay(freq: string, customDays?: number[] | null): string {
  // Check if it's an interval (negative number in customDays)
  if (customDays && customDays.length === 1 && customDays[0] < 0) {
    const interval = Math.abs(customDays[0]);
    return `Every ${interval} days`;
  }

  // Check if it's specific days
  if (freq === 'custom' && customDays && customDays.length > 0) {
    const dayNames = customDays
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
}

/**
 * Format meal relation for display
 */
export function formatMealRelation(mealRelation: MealRelationType | string | null): string {
  switch (mealRelation) {
    case 'none': return 'No restriction';
    case 'before': return 'Before meals';
    case 'with': return 'With meals';
    case 'after': return 'After meals';
    default: return 'Not specified';
  }
}

/**
 * Calculate stock percentage
 */
export function calculateStockPercentage(currentStock: number, initialStock: number): number {
  if (initialStock <= 0) return 0;
  return (currentStock / initialStock) * 100;
}

/**
 * Get stock status based on percentage
 */
export function getStockStatus(stockPct: number): 'critical' | 'low' | 'normal' {
  if (stockPct <= STOCK_THRESHOLDS.veryLowPercent) return 'critical';
  if (stockPct <= STOCK_THRESHOLDS.lowPercent) return 'low';
  return 'normal';
}

/**
 * Get accent color based on stock status
 */
export function getStockAccentColor(stockPct: number): string {
  if (stockPct <= STOCK_THRESHOLDS.veryLowPercent) return '#FB7185'; // Red - critical
  if (stockPct <= STOCK_THRESHOLDS.lowPercent) return '#FB923C'; // Orange - low
  return '#2DD4BF'; // Teal - normal
}

/**
 * Get progress bar color based on stock percentage
 */
export function getProgressBarColor(stockPct: number): string {
  if (stockPct <= 10) return '#FB7185'; // Red - critical
  if (stockPct <= 25) return '#FB923C'; // Orange - low
  return '#00D1FF'; // Cyan - good
}

/**
 * Calculate the low stock threshold in doses based on user's preferred days.
 * Formula: thresholdDays × doseSize × dosesPerDay
 * Falls back to STOCK_THRESHOLDS.low (10) if inputs are invalid.
 */
export function calculateLowStockDoses(
  doseSize: number,
  dosesPerDay: number,
  thresholdDays: number,
): number {
  if (doseSize <= 0 || dosesPerDay <= 0 || thresholdDays <= 0) {
    return STOCK_THRESHOLDS.low;
  }
  return thresholdDays * doseSize * dosesPerDay;
}

// ============================================================================
// AI UPLOAD CONFIGURATION
// ============================================================================

/**
 * Entry modes for medication creation
 */
export const ENTRY_MODES = {
  MANUAL: 'manual',
  AI_SCAN: 'ai_scan',
} as const;

export type EntryMode = 'manual' | 'ai_scan';

/**
 * AI Upload UI copy
 */
export const AI_UPLOAD_COPY = {
  // Consent modal
  CONSENT_TITLE: 'AI-Powered Scan',
  CONSENT_SUBTITLE: 'Quickly add rituals by photographing the label',
  CONSENT_BULLET_1: 'Photos are processed securely and not stored',
  CONSENT_BULLET_2: 'AI extracts details automatically',
  CONSENT_BULLET_3: 'Review and confirm before saving',
  CONSENT_AGREE: 'I Agree',
  CONSENT_CANCEL: 'Enter Manually Instead',

  // Upload screen
  UPLOAD_TITLE: 'Scan Ritual',
  UPLOAD_FRONT_LABEL: 'Front label',
  UPLOAD_BACK_LABEL: 'Back label (optional)',
  UPLOAD_HINT: 'Tap to take a photo or select from gallery',
  UPLOAD_ANALYZING: 'Analyzing...',
  UPLOAD_BUTTON: 'Analyze',

  // Review screen
  REVIEW_TITLE: 'Review Details',
  REVIEW_HIGH_CONFIDENCE: 'AI confident',
  REVIEW_MEDIUM_CONFIDENCE: 'Needs verification',
  REVIEW_LOW_CONFIDENCE: 'Required',
  REVIEW_QUICK_SAVE: 'Quick Save',
  REVIEW_EDIT_DETAILS: 'Review & Edit',

  // Error messages
  ERROR_NO_IMAGE: 'Please add at least one photo',
  ERROR_DUPLICATE: 'Front and back images appear to be the same',
  ERROR_ANALYSIS_FAILED: 'Unable to analyze image. Please try again or enter manually.',
} as const;

/**
 * AI confidence visual styling (colors match confidenceUtils.ts)
 */
export const AI_CONFIDENCE_COLORS = {
  HIGH: {
    border: 'rgba(0, 209, 255, 0.3)',
    background: 'transparent',
    icon: null,
  },
  MEDIUM: {
    border: 'rgba(245, 158, 11, 0.5)',
    background: 'rgba(245, 158, 11, 0.1)',
    icon: '#F59E0B', // Amber
  },
  LOW: {
    border: 'rgba(239, 68, 68, 0.5)',
    background: 'rgba(239, 68, 68, 0.1)',
    icon: '#EF4444', // Red
  },
} as const;

/**
 * Field display names for AI review screen
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  name: 'Medication Name',
  strength: 'Strength',
  doseSize: 'Dose Size',
  doseUnit: 'Dose Unit',
  initialStock: 'Quantity',
  expiryDate: 'Expiry Date',
  frequency: 'Frequency',
  startDate: 'Start Date',
  mealRelation: 'Meal Relation',
  indication: 'Indication',
  specialInstructions: 'Instructions',
  allergies: 'Allergies',
  doctorName: 'Prescriber',
  pharmacyName: 'Pharmacy',
  brandName: 'Brand',
};
