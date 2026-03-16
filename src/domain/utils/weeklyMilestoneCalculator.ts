/**
 * Computes weekly milestone badges for the monthly adherence calendar.
 * Each completed week unlocks a badge whose name reflects adherence quality:
 *   - All perfect → "7-Day Streak" (Flame)
 *   - Some delayed but no missed → "Resilient" (Dumbbell)
 *   - Any missed → "You Got It" (PersonStanding)
 */

import type { DayAdherenceRecord, WeeklyMilestone } from '../types';
import { getDaysInMonth } from './adherenceUtils';

/** Determine milestone name and icon based on the week's adherence quality. */
function classifyWeek(
  perfectCount: number,
  delayedCount: number,
  missedCount: number,
): { milestoneName: string; iconName: string } {
  if (missedCount > 0) {
    return { milestoneName: 'You Got It', iconName: 'PersonStanding' };
  }
  if (delayedCount > 0) {
    return { milestoneName: 'Resilient', iconName: 'Dumbbell' };
  }
  return { milestoneName: '7-Day Streak', iconName: 'Flame' };
}

export function computeWeeklyMilestones(
  days: DayAdherenceRecord[],
  yearMonth: string,
): WeeklyMilestone[] {
  const totalDays = getDaysInMonth(yearMonth);
  const today = new Date().toISOString().slice(0, 10);

  // Fixed week ranges (1-indexed day numbers)
  const weekRanges: [number, number][] = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28],
  ];
  if (totalDays > 28) {
    weekRanges.push([29, totalDays]);
  }

  // Map day number → record for quick lookup
  const dayMap = new Map<number, DayAdherenceRecord>();
  for (const d of days) {
    const dayNum = parseInt(d.date.slice(-2), 10);
    dayMap.set(dayNum, d);
  }

  return weekRanges.map((range, idx) => {
    const [start, end] = range;
    const daysInWeek = end - start + 1;

    let scheduledCount = 0;
    let perfectCount = 0;
    let delayedCount = 0; // days with taken_late but no missed
    let missedCount = 0;  // days with any missed dose
    let hasFutureDay = false;

    for (let day = start; day <= end; day++) {
      const padded = String(day).padStart(2, '0');
      const dateStr = `${yearMonth}-${padded}`;

      if (dateStr > today) {
        hasFutureDay = true;
      }

      const record = dayMap.get(day);
      if (record && record.total_scheduled > 0) {
        scheduledCount++;
        if (record.is_on_time_perfect) {
          perfectCount++;
        } else if (record.missed_count > 0) {
          missedCount++;
        } else if (record.taken_late_count > 0) {
          delayedCount++;
        }
      }
    }

    // Unlock: week fully elapsed, has scheduled days
    const unlocked = !hasFutureDay && scheduledCount > 0;

    const classification = classifyWeek(perfectCount, delayedCount, missedCount);

    return {
      weekNumber: idx + 1,
      label: `Week ${idx + 1}`,
      milestoneName: classification.milestoneName,
      iconName: classification.iconName,
      unlocked,
      daysInWeek,
      perfectDaysInWeek: perfectCount,
      scheduledDaysInWeek: scheduledCount,
    };
  });
}
