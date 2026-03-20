/**
 * Medication scheduling and formatting utilities.
 * Contains all business logic for determining dose schedules.
 * Supports multi-dose medications (once/twice/thrice daily).
 */

import type { Medication, DoseTimeSlot, RitualChip, RitualStatus } from '../types';
import {
  getStartOfToday,
  applyTimeToDate,
  formatTime,
  formatDoseDate,
} from './dateTimeUtils';
import type { TimeFormat } from './dateTimeUtils';

/**
 * Get all dose times for a medication.
 * Returns dose_times array if available, otherwise falls back to single time_of_day.
 */
export function getDoseTimes(med: Medication): string[] {
  if (med.dose_times && med.dose_times.length > 0) {
    return [...med.dose_times].sort(); // HH:MM strings sort correctly lexically
  }
  return [med.time_of_day || '08:00'];
}

/**
 * Get occurrence label for display (e.g., "Twice Daily").
 */
export function formatOccurrence(med: Medication): string | null {
  const occurrence = med.occurrence || 'once';
  if (occurrence === 'once') return null;
  if (occurrence === 'twice') return 'Twice Daily';
  if (occurrence === 'thrice') return 'Three Times Daily';
  return null;
}

/**
 * Format meal relation for display.
 */
export function formatMealRelation(
  mealRelation: string | null | undefined
): string | null {
  if (!mealRelation || mealRelation === 'none') return null;
  switch (mealRelation) {
    case 'before':
      return 'Before meal';
    case 'with':
      return 'With meal';
    case 'after':
      return 'After meal';
    default:
      return null;
  }
}

/**
 * Format dose size for display.
 */
export function formatDoseSize(doseSize: number): string {
  return doseSize > 1 ? `${doseSize} doses` : '1 dose';
}

/**
 * Check if a specific date is a valid dose day for a medication based on frequency.
 */
export function isValidDoseDay(med: Medication, date: Date): boolean {
  const startDate = med.start_date ? new Date(med.start_date) : getStartOfToday();
  startDate.setHours(0, 0, 0, 0);

  // Not started yet
  if (date < startDate) return false;

  // Past end date
  if (med.end_date) {
    const endDate = new Date(med.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (date > endDate) return false;
  }

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (med.frequency) {
    case 'daily':
      return true;

    case 'every_other_day': {
      const daysDiff = Math.floor(
        (dateOnly.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Check for custom interval (stored as negative number)
      if (med.custom_days && med.custom_days.length === 1 && med.custom_days[0] < 0) {
        const interval = Math.abs(med.custom_days[0]);
        return daysDiff % interval === 0;
      }
      return daysDiff % 2 === 0;
    }

    case 'custom': {
      if (med.custom_days && med.custom_days.length > 0) {
        return med.custom_days.includes(date.getDay());
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Check if medication is scheduled for today.
 * Excludes as-needed medications since they don't have scheduled doses.
 */
export function isDoseScheduledForToday(med: Medication): boolean {
  if (med.is_paused || med.is_archived) return false;
  if (med.is_as_needed) return false;
  return isValidDoseDay(med, getStartOfToday());
}

/**
 * Get the scheduled dose time for today (primary/first dose).
 */
export function getTodayDoseTime(med: Medication): Date {
  return applyTimeToDate(getStartOfToday(), med.time_of_day);
}

/**
 * Get all scheduled dose times for today.
 * Returns array of Date objects for each dose time.
 */
export function getTodayDoseTimes(med: Medication): Date[] {
  const today = getStartOfToday();
  return getDoseTimes(med).map(time => applyTimeToDate(today, time));
}

/**
 * Calculate next dose time for a medication (considers all dose times).
 * @param med - The medication
 * @param takenDoseIndices - Set of dose indices already taken today (0, 1, 2)
 * @returns Next dose Date or null if no upcoming dose
 */
export function getNextDoseTime(
  med: Medication,
  takenDoseIndices: Set<number> = new Set()
): Date | null {
  if (med.is_paused || med.is_archived || med.is_as_needed) return null;

  const now = new Date();
  const today = getStartOfToday();
  const doseTimes = getDoseTimes(med);

  // Check if medication hasn't started yet
  const startDate = med.start_date ? new Date(med.start_date) : today;
  startDate.setHours(0, 0, 0, 0);

  if (today < startDate) {
    // Return first dose time on start date
    const [hours, minutes] = doseTimes[0].split(':').map(Number);
    const nextDose = new Date(startDate);
    nextDose.setHours(hours, minutes, 0, 0);
    return nextDose;
  }

  // Check today's doses (find next untaken dose that's still upcoming)
  if (isValidDoseDay(med, today)) {
    for (let i = 0; i < doseTimes.length; i++) {
      if (takenDoseIndices.has(i)) continue; // Skip taken doses

      const [hours, minutes] = doseTimes[i].split(':').map(Number);
      const doseTime = new Date(today);
      doseTime.setHours(hours, minutes, 0, 0);

      // Return this dose if it's still in the future (or current)
      if (doseTime >= now || doseTime.getTime() > now.getTime() - 60000) {
        return doseTime;
      }
    }
  }

  // Find next valid dose day (up to 14 days ahead)
  let nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + 1);

  for (let i = 0; i < 14; i++) {
    if (isValidDoseDay(med, nextDate)) {
      const [hours, minutes] = doseTimes[0].split(':').map(Number);
      const nextDoseTime = new Date(nextDate);
      nextDoseTime.setHours(hours, minutes, 0, 0);
      return nextDoseTime;
    }
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return null;
}

/**
 * Get next dose info string for display (e.g., "Today at 8:00 AM").
 * @param med - The medication
 * @param takenDoseIndices - Set of dose indices already taken today
 */
export function getNextDoseInfoString(
  med: Medication,
  takenDoseIndices: Set<number> = new Set(),
  timeFormat: TimeFormat = '12h'
): string {
  const nextDose = getNextDoseTime(med, takenDoseIndices);

  if (!nextDose) {
    return 'No upcoming doses';
  }

  const today = getStartOfToday();
  const dateDisplay = formatDoseDate(nextDose);
  const timeStr = formatTime(
    `${nextDose.getHours().toString().padStart(2, '0')}:${nextDose.getMinutes().toString().padStart(2, '0')}`,
    timeFormat
  );

  if (dateDisplay === 'Today') {
    return `Today at ${timeStr}`;
  } else if (dateDisplay === 'Tomorrow') {
    return `Tomorrow at ${timeStr}`;
  } else {
    return `${dateDisplay} at ${timeStr}`;
  }
}

/**
 * Get tomorrow's dose time slot with all medications scheduled.
 * Groups medications by their scheduled time and returns the earliest slot.
 * Handles multi-dose medications by creating entries for each dose time.
 *
 * @param medications - All active medications
 * @returns DoseTimeSlot for tomorrow's earliest dose, or null if none scheduled
 */
export function getTomorrowsDoses(medications: Medication[], timeFormat: TimeFormat = '12h'): DoseTimeSlot | null {
  const today = getStartOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter to medications scheduled for tomorrow (not paused/archived/as-needed)
  const tomorrowMeds = medications.filter((med) => {
    if (med.is_paused || med.is_archived || med.is_as_needed) return false;
    return isValidDoseDay(med, tomorrow);
  });

  if (tomorrowMeds.length === 0) {
    return null;
  }

  // Group medications by dose time (each dose time creates a separate entry)
  const doseTimeMap = new Map<string, { doseTime: Date; medications: Medication[] }>();

  for (const med of tomorrowMeds) {
    // Get all dose times for this medication
    const doseTimes = getDoseTimes(med);

    for (const timeStr of doseTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const doseTime = new Date(tomorrow);
      doseTime.setHours(hours, minutes, 0, 0);

      const timeKey = doseTime.toISOString();
      if (doseTimeMap.has(timeKey)) {
        doseTimeMap.get(timeKey)!.medications.push(med);
      } else {
        doseTimeMap.set(timeKey, { doseTime, medications: [med] });
      }
    }
  }

  // Find the earliest dose time
  let earliest: { doseTime: Date; medications: Medication[] } | null = null;
  for (const entry of doseTimeMap.values()) {
    if (!earliest || entry.doseTime < earliest.doseTime) {
      earliest = entry;
    }
  }

  if (!earliest) return null;

  // Build the slot
  const slot: DoseTimeSlot = {
    doseTime: earliest.doseTime,
    timeDisplay: formatTime(earliest.doseTime, timeFormat),
    dateDisplay: 'Tomorrow',
    isTodayDose: false,
    medications: earliest.medications.map((med) => ({
      medication: med,
      mealInfo: formatMealRelation(med.meal_relation),
      doseInfo: med.dose_size > 1 ? `${med.dose_size} doses` : '1 dose',
    })),
  };

  return slot;
}

/**
 * Build RitualChips for today's doses from a list of medications.
 * Creates individual chips for each dose time of multi-dose medications.
 *
 * @param medications - Active medications scheduled for today
 * @param takenChipIds - Set of chip IDs that have been marked as taken
 * @returns Array of RitualChip sorted by scheduled time
 */
export function buildTodayRitualChips(
  medications: Medication[],
  takenChipIds: Set<string> = new Set(),
  timeFormat: TimeFormat = '12h'
): RitualChip[] {
  const now = new Date();
  const chips: RitualChip[] = [];

  for (const med of medications) {
    if (med.is_paused || med.is_archived || med.is_as_needed) continue;
    if (!isValidDoseDay(med, getStartOfToday())) continue;

    const doseTimes = getDoseTimes(med);

    doseTimes.forEach((timeStr, doseIndex) => {
      const scheduledTime = applyTimeToDate(getStartOfToday(), timeStr);
      const chipId = doseTimes.length > 1 ? `${med.id}_dose_${doseIndex}` : med.id;

      // Determine status
      let status: RitualStatus = 'pending';
      const isTaken = takenChipIds.has(chipId);

      if (isTaken) {
        status = 'completed';
      } else if (now.getTime() > scheduledTime.getTime() + 60 * 60 * 1000) {
        // 60+ minutes past scheduled time and not taken = missed
        status = 'missed';
      } else if (scheduledTime < now) {
        // Within 60-minute grace window = due
        status = 'due';
      }

      // Build display name - add dose number suffix for multi-dose meds
      let displayName = med.name;
      if (doseTimes.length > 1) {
        displayName = `${med.name} (Dose ${doseIndex + 1})`;
      }

      chips.push({
        id: chipId,
        medicationId: med.id,
        doseIndex,
        name: displayName,
        doseInfo: formatDoseSize(med.dose_size),
        timeDisplay: formatTime(timeStr, timeFormat),
        scheduledTime,
        mealInfo: formatMealRelation(med.meal_relation),
        status,
        isNextDose: false, // Will be set after sorting
      });
    });
  }

  // Sort by scheduled time
  chips.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

  // Mark the first pending/due chip as the next dose
  const nextDoseChip = chips.find(
    (chip) => chip.status === 'pending' || chip.status === 'due'
  );
  if (nextDoseChip) {
    nextDoseChip.isNextDose = true;
    nextDoseChip.status = 'next';
  }

  return chips;
}
