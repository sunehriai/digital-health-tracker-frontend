/**
 * Ritual building utilities for Today's Rituals timeline.
 * Transforms medications into displayable ritual chips with status.
 */

import type { Medication, RitualChip, RitualStatus } from '../types';
import { formatTime, applyTimeToDate, getStartOfToday } from './dateTimeUtils';
import type { TimeFormat } from './dateTimeUtils';
import {
  isDoseScheduledForToday,
  getTodayDoseTime,
  formatMealRelation,
  formatDoseSize,
  getDoseTimes,
} from './medicationUtils';

/**
 * Calculate the status of a ritual based on current time and taken state.
 * Uses the same 60-minute grace window as the hand-off logic (DOSE_EXPIRY_MS)
 * so that a dose isn't marked 'missed' while it's still shown as the active dose.
 */
export function calculateRitualStatus(
  scheduledTime: Date,
  isTaken: boolean,
  now: Date = new Date()
): RitualStatus {
  if (isTaken) return 'completed';
  const expiryTime = new Date(scheduledTime.getTime() + DOSE_EXPIRY_MS);
  if (now > expiryTime) return 'missed';
  if (now > scheduledTime) return 'due';
  return 'pending';
}

/**
 * Build today's rituals from medications list.
 * Filters to today's scheduled medications, calculates status, and sorts chronologically.
 * Supports multi-dose medications by creating individual chips for each dose time.
 *
 * @param medications - All active medications
 * @param takenTodayIds - Set of chip IDs taken today (e.g., "med.id" or "med.id_dose_1")
 * @returns Array of RitualChip sorted by scheduled time
 */
export function buildTodaysRituals(
  medications: Medication[],
  takenTodayIds: Set<string>,
  timeFormat: TimeFormat = '12h'
): RitualChip[] {
  const now = new Date();
  const today = getStartOfToday();
  const chips: RitualChip[] = [];

  // Filter to medications scheduled for today
  const todaysMeds = medications.filter((med) => isDoseScheduledForToday(med));

  // Create chips for each dose time of each medication
  for (const med of todaysMeds) {
    const doseTimes = getDoseTimes(med);
    const isMultiDose = doseTimes.length > 1;

    doseTimes.forEach((timeStr, doseIndex) => {
      const scheduledTime = applyTimeToDate(today, timeStr);

      // For multi-dose meds: use pattern "med.id_dose_0", "med.id_dose_1", etc.
      // For single-dose meds: just use med.id (backward compatible)
      const chipId = isMultiDose ? `${med.id}_dose_${doseIndex}` : med.id;

      const isTaken = takenTodayIds.has(chipId);
      const status = calculateRitualStatus(scheduledTime, isTaken, now);

      // Display name: add "(Dose 2)" suffix for multi-dose meds
      const displayName = isMultiDose
        ? `${med.name} (Dose ${doseIndex + 1})`
        : med.name;

      chips.push({
        id: chipId,
        medicationId: med.id,
        doseIndex,
        name: displayName,
        doseInfo: formatDoseSize(med.dose_size),
        timeDisplay: formatTime(scheduledTime, timeFormat),
        scheduledTime,
        mealInfo: formatMealRelation(med.meal_relation),
        status,
        isNextDose: false, // Set after sorting
      });
    });
  }

  // Sort chronologically (earliest first)
  chips.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

  // Mark the next actionable chip using the handoff logic.
  // getActiveDose respects: 60-min expiry, 15-min handoff to next dose, taken status.
  const activeChip = getActiveDose(chips, takenTodayIds, now);
  if (activeChip) {
    const activeIndex = chips.findIndex((c) => c.id === activeChip.id);
    if (activeIndex !== -1) {
      // All earlier non-taken, non-completed chips that expired (including via handoff)
      // should be marked as missed — handoff = expired.
      for (let i = 0; i < activeIndex; i++) {
        if (chips[i].status === 'due') {
          chips[i].status = 'missed';
        }
      }
      chips[activeIndex].status = 'next';
      chips[activeIndex].isNextDose = true;
    }
  }

  return chips;
}

/**
 * Get statistics for today's rituals.
 */
export function getRitualStats(rituals: RitualChip[]): {
  total: number;
  completed: number;
  missed: number;
  pending: number;
} {
  return {
    total: rituals.length,
    completed: rituals.filter((r) => r.status === 'completed').length,
    missed: rituals.filter((r) => r.status === 'missed').length,
    pending: rituals.filter((r) => r.status === 'pending' || r.status === 'next' || r.status === 'due')
      .length,
  };
}

/**
 * Find the index of the next dose chip for scroll positioning.
 * Returns index of first 'next' or 'pending', or first 'missed' if all past.
 */
export function findNextDoseIndex(rituals: RitualChip[]): number {
  // First, look for the 'next' status
  const nextIdx = rituals.findIndex((r) => r.status === 'next');
  if (nextIdx !== -1) return nextIdx;

  // If no 'next', find first 'pending'
  const pendingIdx = rituals.findIndex((r) => r.status === 'pending');
  if (pendingIdx !== -1) return pendingIdx;

  // If all completed/missed, return last item
  return Math.max(0, rituals.length - 1);
}

/**
 * Check if all rituals for the day are completed.
 * Returns true only if there are rituals AND all are completed.
 */
export function isAllRitualsComplete(stats: {
  total: number;
  completed: number;
}): boolean {
  return stats.total > 0 && stats.completed === stats.total;
}

/**
 * Calculate daily vitality points based on completed rituals.
 * MVP: Returns mock value for UI development.
 * TODO: Implement actual points calculation logic in future sprint.
 */
export function calculateDailyPoints(_stats: {
  total: number;
  completed: number;
}): number {
  // Mock return value for MVP - will be replaced with actual calculation
  return 88;
}

/**
 * Get placeholder insight text for victory card.
 * MVP: Returns hardcoded string.
 * TODO: Implement dynamic insights based on medication effects in future sprint.
 */
export function getVictoryInsight(): string {
  return 'Your consistency is building lasting vitality.';
}

// ============================================================================
// Action Center (Recovery State) Logic
// ============================================================================

/** Grace period before showing Action Center — matches DOSE_EXPIRY_MS (60 minutes in ms) */
const ACTION_CENTER_GRACE_PERIOD_MS = 60 * 60 * 1000;

/**
 * Get the last (latest) scheduled time from today's rituals.
 */
export function getLastScheduledTime(rituals: RitualChip[]): Date | null {
  if (rituals.length === 0) return null;

  // Rituals are already sorted chronologically, so last item is latest
  return rituals[rituals.length - 1].scheduledTime;
}

/**
 * Check if the Action Center should be displayed.
 *
 * Trigger conditions:
 *
 * Fast path: Last dose of the day is completed but missed doses exist.
 *   Once the last dose IS taken, there's nothing to wait for — show Action Center
 *   immediately so the user can recover missed doses.
 *
 * Standard path (all must be true):
 *   1. Not all rituals are complete
 *   2. No remaining pending doses (no 'pending' or 'next' status)
 *   3. Current time is 60+ minutes past the last scheduled dose
 *      (capped at midnight — never spills into the next day)
 *
 * @param rituals - Today's ritual chips
 * @param stats - Ritual statistics
 * @param now - Current time (for testing)
 */
export function shouldShowActionCenter(
  rituals: RitualChip[],
  stats: { total: number; completed: number; pending: number },
  now: Date = new Date()
): boolean {
  // Condition 1: Not all complete
  if (isAllRitualsComplete(stats)) {
    return false;
  }

  // Fast path: last dose of the day is completed + missed doses exist.
  // No point waiting for the 30-min grace — the user already took their last dose.
  if (rituals.length > 0) {
    const lastRitual = rituals[rituals.length - 1]; // sorted chronologically
    const hasMissed = rituals.some((r) => r.status === 'missed' || r.status === 'due');
    const noFuturePending = !rituals.some((r) => r.status === 'pending' || r.status === 'next');
    if (lastRitual.status === 'completed' && hasMissed && noFuturePending) {
      return true;
    }
  }

  // Standard path: No pending doses remaining
  if (stats.pending > 0) {
    return false;
  }

  // Condition 3: 60+ minutes past last scheduled dose, capped at midnight
  const lastScheduledTime = getLastScheduledTime(rituals);
  if (!lastScheduledTime) {
    return false;
  }

  const gracePeriodEnd = new Date(
    lastScheduledTime.getTime() + ACTION_CENTER_GRACE_PERIOD_MS
  );

  // Cap at midnight so the grace period never spills into the next day
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  const effectiveEnd = gracePeriodEnd > midnight ? midnight : gracePeriodEnd;

  return now >= effectiveEnd;
}

/**
 * Get the oldest missed ritual for Action Center targeting.
 * Returns the first missed ritual (sorted chronologically by scheduled time).
 */
export function getOldestMissedRitual(rituals: RitualChip[]): RitualChip | null {
  // Rituals are already sorted by scheduledTime, find first missed
  return rituals.find((r) => r.status === 'missed') || null;
}

/**
 * Get insight text for Action Center (Tier 1 - Minor Glitch).
 * MVP: Returns placeholder text with medication name.
 * TODO: Implement dynamic Y-factor insights in future sprint.
 */
export function getActionCenterInsight(medicationName: string): string {
  return `Missing ${medicationName} may affect your daily rhythm. Log now to re-sync.`;
}

// ============================================================================
// Hand-off Logic (15-Minute Rule)
// ============================================================================

/** Maximum time a dose can stay in Next Dose slot (60 minutes in ms) */
const DOSE_EXPIRY_MS = 60 * 60 * 1000;

/** Buffer before next dose when current dose should hand off (15 minutes in ms) */
const HANDOFF_BUFFER_MS = 15 * 60 * 1000;

/**
 * Check if a dose should expire and hand off to the next one.
 *
 * A dose expires when ANY of these conditions is true:
 * 1. It has been taken
 * 2. 60 minutes have passed since the scheduled time
 * 3. Current dose's scheduled time has passed AND current time is within
 *    15 minutes of the next scheduled dose (handoff rule only applies to
 *    due/overdue doses, never to pending/future ones)
 *
 * @param currentDoseTime - Scheduled time of the current dose
 * @param nextDoseTime - Scheduled time of the next dose (null if no next dose)
 * @param isTaken - Whether the current dose has been taken
 * @param now - Current time (for testing)
 * @returns true if the dose should expire/hand off
 */
export function shouldDoseExpire(
  currentDoseTime: Date,
  nextDoseTime: Date | null,
  isTaken: boolean,
  now: Date = new Date()
): boolean {
  // Condition 1: Already taken
  if (isTaken) return true;

  // Condition 2: 60 minutes past scheduled time
  const expiryTime = new Date(currentDoseTime.getTime() + DOSE_EXPIRY_MS);
  if (now >= expiryTime) return true;

  // Condition 3: Within 15 minutes of next dose, BUT only if current dose
  // is already past its scheduled time (due/overdue). A pending dose should
  // never be expired just because a nearby future dose exists.
  if (nextDoseTime && now >= currentDoseTime) {
    const handoffTime = new Date(nextDoseTime.getTime() - HANDOFF_BUFFER_MS);
    if (now >= handoffTime) return true;
  }

  return false;
}

/**
 * Get the active dose from today's rituals based on hand-off logic.
 * Returns the first non-expired dose, or null if all are expired/taken.
 *
 * @param rituals - Today's ritual chips (sorted chronologically)
 * @param takenTodayIds - Set of chip IDs taken today (e.g., "med.id" or "med.id_dose_1")
 * @param now - Current time (for testing)
 */
export function getActiveDose(
  rituals: RitualChip[],
  takenTodayIds: Set<string>,
  now: Date = new Date()
): RitualChip | null {
  for (let i = 0; i < rituals.length; i++) {
    const ritual = rituals[i];
    // Use chipId (ritual.id) for taken lookup - supports multi-dose pattern
    const isTaken = takenTodayIds.has(ritual.id);
    const nextRitual = rituals[i + 1] || null;
    const nextDoseTime = nextRitual?.scheduledTime || null;

    if (!shouldDoseExpire(ritual.scheduledTime, nextDoseTime, isTaken, now)) {
      return ritual;
    }
  }

  return null;
}

// ============================================================================
// Critical Miss Detection
// ============================================================================

/**
 * Find any critical medication that has been missed today.
 *
 * @param rituals - Today's ritual chips
 * @param medications - All medications (to check isCritical flag)
 * @returns The first critical missed ritual, or null if none
 */
export function getCriticalMissedRitual(
  rituals: RitualChip[],
  medications: Array<{ id: string; is_critical: boolean }>
): RitualChip | null {
  // Create a set of critical medication IDs
  const criticalIds = new Set(
    medications.filter((m) => m.is_critical).map((m) => m.id)
  );

  // Find first missed ritual that is critical (use medicationId for lookup)
  return rituals.find(
    (r) => r.status === 'missed' && criticalIds.has(r.medicationId)
  ) || null;
}

// ============================================================================
// Dose Revert Logic
// ============================================================================

import { REVERT_WINDOW_MS } from '../constants';

/**
 * Check if a dose can be reverted based on when it was taken.
 * @param takenAt - When the dose was marked as taken
 * @param now - Current time (for testing)
 * @returns true if within 30-minute revert window
 */
export function canRevertDose(takenAt: Date, now: Date = new Date()): boolean {
  const elapsed = now.getTime() - takenAt.getTime();
  return elapsed >= 0 && elapsed < REVERT_WINDOW_MS;
}
