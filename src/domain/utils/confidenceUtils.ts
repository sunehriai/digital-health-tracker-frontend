/**
 * Confidence utilities for AI medication extraction.
 *
 * Centralizes all confidence threshold logic to avoid duplication
 * and ensure consistent behavior across the app.
 */

// ============================================================
// CONFIDENCE THRESHOLDS (Single source of truth)
// ============================================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,    // Fields with confidence >= 0.85 are considered reliable
  MEDIUM: 0.50,  // Fields with confidence >= 0.50 need verification
  LOW: 0.50,     // Fields with confidence < 0.50 require user input
} as const;

export const QUICK_SAVE_THRESHOLD = 0.90; // All fields must be >= this for Quick Save

// ============================================================
// CONFIDENCE LEVELS
// ============================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Get the confidence level for a given score.
 *
 * @param confidence - Confidence score from 0.0 to 1.0
 * @returns 'high' | 'medium' | 'low'
 */
export function getConfidenceLevel(confidence: number | null | undefined): ConfidenceLevel {
  if (confidence === null || confidence === undefined) {
    return 'low';
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'high';
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'medium';
  }

  return 'low';
}

/**
 * Check if a field has high confidence.
 */
export function isHighConfidence(confidence: number | null | undefined): boolean {
  return getConfidenceLevel(confidence) === 'high';
}

/**
 * Check if a field has low confidence (needs user input).
 */
export function isLowConfidence(confidence: number | null | undefined): boolean {
  return getConfidenceLevel(confidence) === 'low';
}

// ============================================================
// FIELD STATUS MAPPING
// ============================================================

export type FieldStatus = Record<string, ConfidenceLevel>;

/**
 * Build a field status map from confidence scores.
 *
 * @param fieldConfidences - Map of field names to confidence scores
 * @returns Map of field names to confidence levels
 */
export function buildFieldStatus(
  fieldConfidences: Record<string, number | null | undefined>
): FieldStatus {
  const status: FieldStatus = {};

  for (const [field, confidence] of Object.entries(fieldConfidences)) {
    status[field] = getConfidenceLevel(confidence);
  }

  return status;
}

/**
 * Check if any field has low confidence.
 */
export function hasAnyLowConfidence(fieldStatus: FieldStatus): boolean {
  return Object.values(fieldStatus).some((level) => level === 'low');
}

/**
 * Check if any field has medium or low confidence (needs review).
 */
export function hasAnyNeedsReview(fieldStatus: FieldStatus): boolean {
  return Object.values(fieldStatus).some((level) => level !== 'high');
}

/**
 * Get all fields that need user attention (medium or low confidence).
 */
export function getFieldsNeedingReview(fieldStatus: FieldStatus): string[] {
  return Object.entries(fieldStatus)
    .filter(([_, level]) => level !== 'high')
    .map(([field]) => field);
}

// ============================================================
// QUICK SAVE DECISION
// ============================================================

/**
 * Determine if Quick Save flow should be shown.
 *
 * Quick Save is available when ALL of these conditions are met:
 * 1. All fields have confidence >= QUICK_SAVE_THRESHOLD (0.90)
 * 2. No fields are flagged for review
 * 3. Medication name is present
 * 4. Initial stock is present and > 0
 *
 * @param fieldConfidences - Map of field names to confidence scores
 * @param hasRequiredFields - Whether required fields (name, stock) are present
 * @param flaggedForReview - Whether AI flagged for manual review
 * @returns true if Quick Save should be shown
 */
export function shouldShowQuickSave(
  fieldConfidences: Record<string, number | null | undefined>,
  hasRequiredFields: boolean,
  flaggedForReview: boolean
): boolean {
  if (flaggedForReview) return false;
  if (!hasRequiredFields) return false;

  // Check all confidences meet the Quick Save threshold
  for (const confidence of Object.values(fieldConfidences)) {
    if (confidence === null || confidence === undefined) continue; // Skip optional fields
    if (confidence < QUICK_SAVE_THRESHOLD) return false;
  }

  return true;
}

// ============================================================
// AVERAGE CONFIDENCE
// ============================================================

/**
 * Calculate average confidence across all fields.
 * Skips null/undefined values.
 *
 * @param fieldConfidences - Map of field names to confidence scores
 * @returns Average confidence (0.0-1.0) or null if no valid scores
 */
export function calculateAverageConfidence(
  fieldConfidences: Record<string, number | null | undefined>
): number | null {
  const validScores = Object.values(fieldConfidences).filter(
    (c): c is number => c !== null && c !== undefined
  );

  if (validScores.length === 0) return null;

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / validScores.length) * 1000) / 1000; // Round to 3 decimals
}

// ============================================================
// UI STYLING HELPERS
// ============================================================

export interface ConfidenceStyles {
  borderColor: string;
  backgroundColor: string;
  iconName: 'check-circle' | 'alert-circle' | 'x-circle' | null;
  iconColor: string;
  labelText: string | null;
}

/**
 * Get UI styling properties for a confidence level.
 *
 * @param level - Confidence level
 * @returns Styling properties for the field
 */
export function getConfidenceStyles(level: ConfidenceLevel): ConfidenceStyles {
  switch (level) {
    case 'high':
      return {
        borderColor: 'rgba(0, 209, 255, 0.3)', // Cyan (normal)
        backgroundColor: 'transparent',
        iconName: null,
        iconColor: '',
        labelText: null,
      };

    case 'medium':
      return {
        borderColor: 'rgba(245, 158, 11, 0.5)', // Amber
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        iconName: 'alert-circle',
        iconColor: '#F59E0B',
        labelText: 'Needs verification',
      };

    case 'low':
      return {
        borderColor: 'rgba(239, 68, 68, 0.5)', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        iconName: 'x-circle',
        iconColor: '#EF4444',
        labelText: 'Required',
      };
  }
}
