/**
 * AI Transform Utilities
 *
 * Transforms Gemini API response to flat form data structure.
 * Handles frequency mapping, meal relation mapping, and confidence tracking.
 */

import { getLocalDateString } from './dateTimeUtils';
import {
  buildFieldStatus,
  calculateAverageConfidence,
  ConfidenceLevel,
  FieldStatus,
} from './confidenceUtils';

// ============================================================
// GEMINI RESPONSE TYPES
// ============================================================

interface ConfidenceField<T> {
  value: T | null;
  confidence: number;
}

interface GeminiMedicationInfo {
  name: ConfidenceField<string>;
  strength: ConfidenceField<string>;
  dose: {
    size: ConfidenceField<number>;
    unit: ConfidenceField<string>;
  };
  inventory: {
    initial_stock: { value: number | null; unit: string | null; confidence: number };
    expiry_date: ConfidenceField<string>;
  };
}

interface GeminiSchedule {
  frequency: ConfidenceField<string>;
  frequency_raw_text: string | null;
  start_date: ConfidenceField<string>;
  end_date: ConfidenceField<string>;
  meal_relation: ConfidenceField<'Before' | 'With' | 'After' | null>;
}

interface GeminiSafetyAndMeta {
  indication: ConfidenceField<string>;
  special_instructions: ConfidenceField<string>;
  specific_allergies: ConfidenceField<string>;
  prescriber: {
    doctor: ConfidenceField<string>;
    pharmacy: ConfidenceField<string>;
    brand: ConfidenceField<string>;
  };
}

export interface GeminiResponse {
  medication_info: GeminiMedicationInfo;
  schedule: GeminiSchedule;
  safety_and_meta: GeminiSafetyAndMeta;
  flagged_for_review: boolean;
  is_incomplete: boolean;
  error_code: string | null;
}

// ============================================================
// FORM DATA TYPES
// ============================================================

export type FrequencyType = 'daily' | 'specific_days' | 'interval' | 'as_needed' | null;
export type Occurrence = 'once' | 'twice' | 'thrice';
export type MealRelation = 'none' | 'before' | 'with' | 'after';
export type DoseUnit = 'tablets' | 'capsules' | 'mL' | 'tsp';

export interface MedicationFormData {
  // Basic info
  name: string;
  strength: string | null;

  // Dosage
  doseSize: number;
  doseUnit: DoseUnit;

  // Schedule
  frequencyType: FrequencyType;
  occurrence: Occurrence;
  intervalDays: number;
  doseIntervalHours: number;
  selectedDays: number[];
  isAsNeeded: boolean;

  // Dates
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  isOngoing: boolean;
  expiryDate: string | null;

  // Time & Meal
  timeOfDay: string; // HH:MM
  mealRelation: MealRelation;

  // Inventory
  initialStock: number;

  // Details
  indication: string | null;
  specialInstructions: string | null;
  allergies: string | null;
  doctorName: string | null;
  pharmacyName: string | null;
  brandName: string | null;

  // Flags
  isCritical: boolean;
}

export interface TransformResult {
  success: boolean;
  data: MedicationFormData | null;
  fieldConfidence: Record<string, number>;
  fieldStatus: FieldStatus;
  warnings: string[];
  errors: string[];
  averageConfidence: number | null;
  flaggedForReview: boolean;
}

// ============================================================
// FREQUENCY MAPPING
// ============================================================

const GEMINI_FREQUENCY_MAP: Record<string, {
  frequencyType: FrequencyType;
  occurrence: Occurrence;
  intervalDays: number;
  isAsNeeded: boolean;
}> = {
  'daily': { frequencyType: 'daily', occurrence: 'once', intervalDays: 2, isAsNeeded: false },
  'twice_daily': { frequencyType: 'daily', occurrence: 'twice', intervalDays: 2, isAsNeeded: false },
  'three_times_daily': { frequencyType: 'daily', occurrence: 'thrice', intervalDays: 2, isAsNeeded: false },
  'as_needed': { frequencyType: 'as_needed', occurrence: 'once', intervalDays: 2, isAsNeeded: true },
  'every_other_day': { frequencyType: 'interval', occurrence: 'once', intervalDays: 2, isAsNeeded: false },
  'prn': { frequencyType: 'as_needed', occurrence: 'once', intervalDays: 2, isAsNeeded: true },
};

/**
 * Parse day names from raw frequency text.
 * E.g., "Monday, Wednesday, Friday" -> [1, 3, 5]
 */
function parseSpecificDays(rawText: string | null): number[] {
  if (!rawText) return [];

  const dayMap: Record<string, number> = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
  };

  const normalizedText = rawText.toLowerCase();
  const foundDays: number[] = [];

  for (const [dayName, dayValue] of Object.entries(dayMap)) {
    if (normalizedText.includes(dayName) && !foundDays.includes(dayValue)) {
      foundDays.push(dayValue);
    }
  }

  return foundDays.sort((a, b) => a - b);
}

/**
 * Map Gemini frequency to UI state.
 */
function mapFrequencyToUI(
  frequencyValue: string | null,
  frequencyRawText: string | null
): {
  frequencyType: FrequencyType;
  occurrence: Occurrence;
  intervalDays: number;
  doseIntervalHours: number;
  selectedDays: number[];
  isAsNeeded: boolean;
} {
  const defaultState = {
    frequencyType: null as FrequencyType,
    occurrence: 'once' as Occurrence,
    intervalDays: 2,
    doseIntervalHours: 12,
    selectedDays: [] as number[],
    isAsNeeded: false,
  };

  // Try to map known frequency codes
  if (frequencyValue) {
    const normalized = frequencyValue.toLowerCase().replace(/ /g, '_');
    const mapping = GEMINI_FREQUENCY_MAP[normalized];

    if (mapping) {
      return {
        ...defaultState,
        ...mapping,
        doseIntervalHours: mapping.occurrence === 'thrice' ? 8 : 12,
      };
    }
  }

  // Try to parse specific days from raw text
  const parsedDays = parseSpecificDays(frequencyRawText);
  if (parsedDays.length > 0) {
    return {
      ...defaultState,
      frequencyType: 'specific_days',
      selectedDays: parsedDays,
    };
  }

  return defaultState;
}

// ============================================================
// MEAL RELATION MAPPING
// ============================================================

/**
 * Map Gemini meal relation to UI index.
 */
function mapMealRelation(geminiValue: string | null): MealRelation {
  if (!geminiValue) return 'none';

  const normalized = geminiValue.toLowerCase();

  switch (normalized) {
    case 'before': return 'before';
    case 'with': return 'with';
    case 'after': return 'after';
    default: return 'none';
  }
}

// ============================================================
// DOSE UNIT MAPPING
// ============================================================

/**
 * Resolve a raw unit string to a DoseUnit enum value.
 * Returns null if the string doesn't match any known unit.
 */
function resolveUnit(rawUnit: string | null): DoseUnit | null {
  if (!rawUnit) return null;

  const normalized = rawUnit.toLowerCase();

  if (normalized.includes('tablet')) return 'tablets';
  if (normalized.includes('capsule')) return 'capsules';
  if (normalized.includes('ml') || normalized.includes('milliliter')) return 'mL';
  if (normalized.includes('tsp') || normalized.includes('teaspoon')) return 'tsp';
  if (normalized.includes('fl oz') || normalized.includes('fluid')) return 'mL'; // closest supported liquid unit

  return null;
}

/**
 * Check if a DoseUnit represents a liquid measurement.
 */
function isLiquidUnit(unit: DoseUnit | null): boolean {
  return unit === 'mL' || unit === 'tsp';
}

/**
 * Map Gemini dose unit to app dose unit, with inventory-unit fallback.
 * Tries dose.unit first → falls back to inventoryUnit → ultimate fallback 'tablets'.
 */
function mapDoseUnit(geminiUnit: string | null, inventoryUnit?: string | null): DoseUnit {
  // Try dose unit first
  const resolved = resolveUnit(geminiUnit);
  if (resolved) return resolved;

  // Fall back to inventory unit (e.g., bottle says "355 mL" but no per-dose unit)
  const inventoryResolved = resolveUnit(inventoryUnit ?? null);
  if (inventoryResolved) return inventoryResolved;

  // Ultimate fallback
  return 'tablets';
}

// ============================================================
// MAIN TRANSFORM FUNCTION
// ============================================================

/**
 * Transform Gemini response to flat form data.
 */
export function transformGeminiResponse(response: GeminiResponse): TransformResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for error codes first
  if (response.error_code) {
    return {
      success: false,
      data: null,
      fieldConfidence: {},
      fieldStatus: {},
      warnings: [],
      errors: [getErrorMessage(response.error_code)],
      averageConfidence: null,
      flaggedForReview: false,
    };
  }

  // Extract confidence scores
  const fieldConfidence: Record<string, number> = {
    name: response.medication_info.name.confidence,
    strength: response.medication_info.strength.confidence,
    doseSize: response.medication_info.dose.size.confidence,
    doseUnit: response.medication_info.dose.unit.confidence,
    initialStock: response.medication_info.inventory.initial_stock.confidence,
    expiryDate: response.medication_info.inventory.expiry_date.confidence,
    frequency: response.schedule.frequency.confidence,
    startDate: response.schedule.start_date.confidence,
    mealRelation: response.schedule.meal_relation.confidence,
    indication: response.safety_and_meta.indication.confidence,
    specialInstructions: response.safety_and_meta.special_instructions.confidence,
    allergies: response.safety_and_meta.specific_allergies.confidence,
    doctorName: response.safety_and_meta.prescriber.doctor.confidence,
    pharmacyName: response.safety_and_meta.prescriber.pharmacy.confidence,
    brandName: response.safety_and_meta.prescriber.brand.confidence,
  };

  // Build field status
  const fieldStatus = buildFieldStatus(fieldConfidence);

  // Map frequency
  const frequencyMapping = mapFrequencyToUI(
    response.schedule.frequency.value,
    response.schedule.frequency_raw_text
  );

  // Handle unmapped frequency
  let specialInstructions = response.safety_and_meta.special_instructions.value || '';
  if (frequencyMapping.frequencyType === null && response.schedule.frequency_raw_text) {
    specialInstructions = `Schedule from label: "${response.schedule.frequency_raw_text}"\n${specialInstructions}`.trim();
    warnings.push('Frequency could not be mapped automatically. Please select from the dropdown.');
  }

  // Map dose unit — use inventory unit as fallback when dose unit confidence is low
  const inventoryUnit = response.medication_info.inventory.initial_stock.unit;
  const doseUnitConfidence = response.medication_info.dose.unit.confidence;
  const useInventoryFallback = doseUnitConfidence < 0.5;
  let doseUnit = mapDoseUnit(
    response.medication_info.dose.unit.value,
    useInventoryFallback ? inventoryUnit : undefined
  );

  // Cross-field sanity check: if final unit is 'tablets' but inventory unit is liquid → override
  const resolvedInventoryUnit = resolveUnit(inventoryUnit);
  if (doseUnit === 'tablets' && resolvedInventoryUnit && isLiquidUnit(resolvedInventoryUnit)) {
    doseUnit = resolvedInventoryUnit;
    warnings.push('Liquid medication detected from bottle label. Unit set to "' + doseUnit + '" instead of "tablets".');
  }

  // Sanity checks
  const doseSize = response.medication_info.dose.size.value;
  if (doseSize && doseSize > 10) {
    warnings.push('Dose size seems unusually high. Please verify.');
    fieldStatus.doseSize = 'low';
  }

  const initialStock = response.medication_info.inventory.initial_stock.value;
  if (initialStock && initialStock > 1000) {
    warnings.push('Stock quantity seems unusually high. Please verify.');
    fieldStatus.initialStock = 'low';
  }

  // High-stock tablet warning: if stock > 200 and unit is still 'tablets' → flag for review
  if (initialStock && initialStock > 200 && doseUnit === 'tablets') {
    warnings.push('Stock of ' + initialStock + ' tablets seems high. Verify this is not a liquid volume.');
    fieldStatus.initialStock = 'low';
  }

  // Build form data
  const formData: MedicationFormData = {
    name: response.medication_info.name.value || '',
    strength: response.medication_info.strength.value,

    doseSize: doseSize || 1,
    doseUnit,

    ...frequencyMapping,

    startDate: response.schedule.start_date.value || getLocalDateString(),
    endDate: response.schedule.end_date.value,
    isOngoing: !response.schedule.end_date.value,
    expiryDate: response.medication_info.inventory.expiry_date.value,

    timeOfDay: '08:00', // Default - not extracted from labels
    mealRelation: mapMealRelation(response.schedule.meal_relation.value),

    initialStock: initialStock || 0,

    indication: response.safety_and_meta.indication.value,
    specialInstructions: specialInstructions || null,
    allergies: response.safety_and_meta.specific_allergies.value,
    doctorName: response.safety_and_meta.prescriber.doctor.value,
    pharmacyName: response.safety_and_meta.prescriber.pharmacy.value,
    brandName: response.safety_and_meta.prescriber.brand.value,

    isCritical: false,
  };

  // Check if we have minimum required data
  if (!formData.name) {
    errors.push('Could not extract medication name from the image.');
    fieldStatus.name = 'low';
  }

  if (formData.initialStock === 0) {
    warnings.push('Stock quantity not detected. Please enter manually.');
    fieldStatus.initialStock = 'low';
  }

  return {
    success: errors.length === 0,
    data: formData,
    fieldConfidence,
    fieldStatus,
    warnings,
    errors,
    averageConfidence: calculateAverageConfidence(fieldConfidence),
    flaggedForReview: response.flagged_for_review || response.is_incomplete,
  };
}

// ============================================================
// ERROR MESSAGES
// ============================================================

const ERROR_MESSAGES: Record<string, string> = {
  'MULTIPLE_PRODUCTS': 'Multiple medications detected. Please photograph one medication at a time.',
  'UNSUPPORTED_LANGUAGE': 'We currently only support English labels. Please enter this medication manually.',
  'PRODUCT_MISMATCH': 'The front and back images appear to be from different products. Please try again.',
  'NOT_PACKAGING': 'We detected a document instead of medication packaging. Please enter details manually.',
  'UNSUPPORTED_FORMAT': 'This format is not yet supported. Please enter details manually.',
  'API_ERROR': 'Unable to analyze the image. Please try again or enter details manually.',
  'PARSE_ERROR': 'Unable to process the AI response. Please try again or enter details manually.',
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly error message for an error code.
 */
export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['INTERNAL_ERROR'];
}

/**
 * Check if an error code is a "hard" error (requires restart).
 */
export function isHardError(errorCode: string): boolean {
  return ['MULTIPLE_PRODUCTS', 'UNSUPPORTED_LANGUAGE', 'PRODUCT_MISMATCH'].includes(errorCode);
}

/**
 * Check if an error code is a "soft" error (can proceed to manual entry).
 */
export function isSoftError(errorCode: string): boolean {
  return ['NOT_PACKAGING', 'UNSUPPORTED_FORMAT'].includes(errorCode);
}
