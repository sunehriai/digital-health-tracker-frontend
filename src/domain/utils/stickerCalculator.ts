import type { DayAdherenceRecord } from '../types';

export type StickerType = 'sprint' | 'warrior' | 'resilience' | 'perfect_week';

/**
 * Computes milestone stickers for calendar days.
 * Key = ISO date string, value = highest-priority sticker.
 * Priority: warrior > sprint > perfect_week > resilience.
 * "Perfect" = is_on_time_perfect === true (not adherence_pct === 100).
 * Cross-month resilience streaks are NOT tracked.
 */
export function computeStickers(
  days: DayAdherenceRecord[],
): Map<string, StickerType> {
  const stickers = new Map<string, StickerType>();

  // Sort days chronologically
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let lastBreakIndex = -1; // index of the last non-perfect day

  // Pass 1: Streak-based stickers (sprint, warrior)
  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    if (day.is_on_time_perfect) {
      currentStreak++;
      if (currentStreak === 7) {
        stickers.set(day.date, 'sprint');
      }
      if (currentStreak === 14) {
        stickers.set(day.date, 'warrior');
      }
    } else {
      if (day.adherence_pct !== null) {
        // This is a real day (not future/empty) that broke the streak
        lastBreakIndex = i;
      }
      currentStreak = 0;
    }
  }

  // Pass 2: Resilience stickers
  // After a break day, if exactly 3 consecutive perfect days follow,
  // the 3rd recovery day gets 'resilience' (if no higher-priority sticker)
  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    // Check if this day is a break (non-perfect, with actual data)
    if (!day.is_on_time_perfect && day.adherence_pct !== null) {
      // Check next 3 days
      if (i + 3 < sorted.length) {
        const d1 = sorted[i + 1];
        const d2 = sorted[i + 2];
        const d3 = sorted[i + 3];
        if (d1.is_on_time_perfect && d2.is_on_time_perfect && d3.is_on_time_perfect) {
          // Only set if no higher-priority sticker already there
          if (!stickers.has(d3.date)) {
            stickers.set(d3.date, 'resilience');
          }
        }
      }
    }
  }

  // Pass 3: Perfect week stickers
  // Check each Monday-Sunday block. If all 7 days are is_on_time_perfect, mark Sunday.
  const dateMap = new Map<string, DayAdherenceRecord>();
  for (const day of sorted) {
    dateMap.set(day.date, day);
  }

  // Find all Mondays in the data
  for (const day of sorted) {
    const d = new Date(day.date + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun ... 6=Sat
    if (dow !== 1) continue; // Not Monday

    // Check Mon through Sun (7 days)
    let allPerfect = true;
    let sundayDate: string | null = null;
    for (let offset = 0; offset < 7; offset++) {
      const checkDate = new Date(d);
      checkDate.setDate(checkDate.getDate() + offset);
      const checkStr = checkDate.toISOString().split('T')[0];
      const record = dateMap.get(checkStr);
      if (!record || !record.is_on_time_perfect) {
        allPerfect = false;
        break;
      }
      if (offset === 6) sundayDate = checkStr;
    }

    if (allPerfect && sundayDate) {
      // Only set if no higher-priority sticker (warrior or sprint)
      const existing = stickers.get(sundayDate);
      if (!existing || (existing !== 'warrior' && existing !== 'sprint')) {
        stickers.set(sundayDate, 'perfect_week');
      }
    }
  }

  return stickers;
}

// --- Streak Flame Indicators ---

export type StreakIndicator = 'flame' | 'pillar';

/**
 * Computes streak flame indicators for each calendar day.
 * Each day in a consecutive perfect-day run gets a 'flame'.
 * The 7th consecutive day gets 'pillar' (milestone medal).
 * After a pillar, the counter resets and flames continue for the next run.
 *
 * Cross-month: if bestStreakStart is before the first day of the month,
 * the streak is treated as continuing from day 1 for pillar counting.
 */
export function computeStreakFlames(
  days: DayAdherenceRecord[],
  bestStreakStart: string | null,
): Map<string, StreakIndicator> {
  const flames = new Map<string, StreakIndicator>();
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return flames;

  // Determine if streak started before this month
  const firstDate = sorted[0].date;
  let streakCount = 0;

  if (bestStreakStart && bestStreakStart < firstDate) {
    // Streak started last month — estimate days elapsed from streak start to first day
    const start = new Date(bestStreakStart + 'T00:00:00');
    const first = new Date(firstDate + 'T00:00:00');
    const daysElapsed = Math.round((first.getTime() - start.getTime()) / 86400000);
    // Only carry over if the first day continues the streak
    if (sorted[0].is_on_time_perfect) {
      streakCount = daysElapsed % 7; // position within the 7-day pillar cycle
    }
  }

  for (const day of sorted) {
    if (day.is_on_time_perfect) {
      streakCount++;
      if (streakCount === 7) {
        flames.set(day.date, 'pillar');
        streakCount = 0; // reset after pillar
      } else {
        flames.set(day.date, 'flame');
      }
    } else {
      streakCount = 0;
    }
  }

  return flames;
}
