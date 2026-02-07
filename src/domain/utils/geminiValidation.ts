/**
 * Gemini Response Validation
 *
 * Runtime type guards for validating Gemini API response structure.
 * Uses TypeScript type guards instead of Zod to avoid adding dependencies.
 */

import { GeminiResponse } from './aiTransformUtils';

// ============================================================
// VALIDATION HELPERS
// ============================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfidenceField(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    'value' in value &&
    'confidence' in value &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1
  );
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNullOrString(value: unknown): boolean {
  return value === null || isString(value);
}

function isNullOrNumber(value: unknown): boolean {
  return value === null || isNumber(value);
}

// ============================================================
// SECTION VALIDATORS
// ============================================================

function validateMedicationInfo(info: unknown): string | null {
  if (!isObject(info)) {
    return 'medication_info must be an object';
  }

  if (!isConfidenceField(info.name)) {
    return 'medication_info.name must have value and confidence';
  }

  if (!isConfidenceField(info.strength)) {
    return 'medication_info.strength must have value and confidence';
  }

  // Validate dose
  if (!isObject(info.dose)) {
    return 'medication_info.dose must be an object';
  }
  if (!isConfidenceField(info.dose.size)) {
    return 'medication_info.dose.size must have value and confidence';
  }
  if (!isConfidenceField(info.dose.unit)) {
    return 'medication_info.dose.unit must have value and confidence';
  }

  // Validate inventory
  if (!isObject(info.inventory)) {
    return 'medication_info.inventory must be an object';
  }
  if (!isObject(info.inventory.initial_stock)) {
    return 'medication_info.inventory.initial_stock must be an object';
  }
  if (!isConfidenceField(info.inventory.expiry_date)) {
    return 'medication_info.inventory.expiry_date must have value and confidence';
  }

  return null;
}

function validateSchedule(schedule: unknown): string | null {
  if (!isObject(schedule)) {
    return 'schedule must be an object';
  }

  if (!isConfidenceField(schedule.frequency)) {
    return 'schedule.frequency must have value and confidence';
  }

  if (!isNullOrString(schedule.frequency_raw_text)) {
    return 'schedule.frequency_raw_text must be string or null';
  }

  if (!isConfidenceField(schedule.start_date)) {
    return 'schedule.start_date must have value and confidence';
  }

  if (!isConfidenceField(schedule.end_date)) {
    return 'schedule.end_date must have value and confidence';
  }

  if (!isConfidenceField(schedule.meal_relation)) {
    return 'schedule.meal_relation must have value and confidence';
  }

  return null;
}

function validateSafetyAndMeta(safety: unknown): string | null {
  if (!isObject(safety)) {
    return 'safety_and_meta must be an object';
  }

  if (!isConfidenceField(safety.indication)) {
    return 'safety_and_meta.indication must have value and confidence';
  }

  if (!isConfidenceField(safety.special_instructions)) {
    return 'safety_and_meta.special_instructions must have value and confidence';
  }

  if (!isConfidenceField(safety.specific_allergies)) {
    return 'safety_and_meta.specific_allergies must have value and confidence';
  }

  // Validate prescriber
  if (!isObject(safety.prescriber)) {
    return 'safety_and_meta.prescriber must be an object';
  }
  if (!isConfidenceField(safety.prescriber.doctor)) {
    return 'safety_and_meta.prescriber.doctor must have value and confidence';
  }
  if (!isConfidenceField(safety.prescriber.pharmacy)) {
    return 'safety_and_meta.prescriber.pharmacy must have value and confidence';
  }
  if (!isConfidenceField(safety.prescriber.brand)) {
    return 'safety_and_meta.prescriber.brand must have value and confidence';
  }

  return null;
}

// ============================================================
// MAIN VALIDATION FUNCTION
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data: GeminiResponse | null;
}

/**
 * Validate raw API response matches expected Gemini structure.
 * Returns typed GeminiResponse if valid, errors if not.
 */
export function validateGeminiResponse(raw: unknown): ValidationResult {
  const errors: string[] = [];

  // Top-level object check
  if (!isObject(raw)) {
    return {
      isValid: false,
      errors: ['Response must be an object'],
      data: null,
    };
  }

  // Validate medication_info section
  const medInfoError = validateMedicationInfo(raw.medication_info);
  if (medInfoError) errors.push(medInfoError);

  // Validate schedule section
  const scheduleError = validateSchedule(raw.schedule);
  if (scheduleError) errors.push(scheduleError);

  // Validate safety_and_meta section
  const safetyError = validateSafetyAndMeta(raw.safety_and_meta);
  if (safetyError) errors.push(safetyError);

  // Validate flags
  if (!isBoolean(raw.flagged_for_review)) {
    errors.push('flagged_for_review must be a boolean');
  }

  if (!isBoolean(raw.is_incomplete)) {
    errors.push('is_incomplete must be a boolean');
  }

  if (!isNullOrString(raw.error_code)) {
    errors.push('error_code must be string or null');
  }

  // Return result
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      data: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    data: raw as unknown as GeminiResponse,
  };
}

/**
 * Quick check if response has a hard error code.
 * Use before full validation for fast failure path.
 */
export function hasErrorCode(raw: unknown): string | null {
  if (!isObject(raw)) return null;
  if (isString(raw.error_code)) return raw.error_code;
  return null;
}

/**
 * Create a default/empty Gemini response for fallback scenarios.
 */
export function createEmptyGeminiResponse(): GeminiResponse {
  const emptyConfidence = <T>(value: T) => ({ value, confidence: 0 });

  return {
    medication_info: {
      name: emptyConfidence(null),
      strength: emptyConfidence(null),
      dose: {
        size: emptyConfidence(null),
        unit: emptyConfidence(null),
      },
      inventory: {
        initial_stock: { value: null, unit: null, confidence: 0 },
        expiry_date: emptyConfidence(null),
      },
    },
    schedule: {
      frequency: emptyConfidence(null),
      frequency_raw_text: null,
      start_date: emptyConfidence(null),
      end_date: emptyConfidence(null),
      meal_relation: emptyConfidence(null),
    },
    safety_and_meta: {
      indication: emptyConfidence(null),
      special_instructions: emptyConfidence(null),
      specific_allergies: emptyConfidence(null),
      prescriber: {
        doctor: emptyConfidence(null),
        pharmacy: emptyConfidence(null),
        brand: emptyConfidence(null),
      },
    },
    flagged_for_review: false,
    is_incomplete: true,
    error_code: null,
  };
}
