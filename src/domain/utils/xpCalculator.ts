/**
 * Client-side XP estimation for the Delayed Counter Trick (D17).
 *
 * This calculator produces an estimated XP value that fires immediately
 * in the XpAnimation component. The server-authoritative value arrives
 * ~200-500ms later and updates the header.
 *
 * SYNC: must match vision-backend gamification_service.py XP constants.
 * Any change to the server formula MUST be mirrored here.
 */

// SYNC: must match vision-backend gamification_service.py XP_BASE
const XP_BASE = 10;

// SYNC: must match vision-backend gamification_service.py XP_STREAK_MULTIPLIER
const XP_STREAK_MULT = 2;

// SYNC: must match vision-backend gamification_service.py XP_STREAK_CAP
const XP_STREAK_CAP = 30;

// SYNC: must match vision-backend gamification_service.py COMEBACK_MULTIPLIER
const COMEBACK_MULTIPLIER = 2;

/**
 * Estimate the XP that will be awarded for completing all daily doses.
 *
 * D17 "Better-informed calculator": Takes `streakDays` and `isBoostActive`
 * from useGamification() status (fetched on app open).
 *
 * Formula: base(10) + min(streak * mult, cap), doubled if boost active.
 *
 * SYNC: must match vision-backend gamification_service.py _award_daily_xp()
 *
 * @param streakDays - Current streak from useGamification()
 * @param isBoostActive - Whether comeback boost is active from useGamification()
 * @returns Estimated XP for completing all today's doses
 */
export function estimateDailyXp(streakDays: number, isBoostActive: boolean): number {
  // The streak increments BEFORE bonus calculation on the server, so we
  // simulate the upcoming streak value (current + 1) for "perfect" day.
  const nextStreak = streakDays + 1;
  const streakBonus = Math.min(XP_STREAK_MULT * nextStreak, XP_STREAK_CAP);
  const baseXp = XP_BASE + streakBonus;

  // SYNC: Comeback boost multiplies daily XP only (not one-time events)
  const multiplier = isBoostActive ? COMEBACK_MULTIPLIER : 1;
  return Math.round(baseXp * multiplier);
}

/**
 * Estimate how many calendar days of perfect adherence are needed to earn
 * a given amount of XP, accounting for non-dose days (e.g. alternate-day meds).
 *
 * On non-dose days the streak is preserved but no XP is earned.
 *
 * @param xpNeeded - Total XP the user still needs
 * @param currentStreak - Current streak days from useGamification()
 * @param doseDaysPerWeek - Average number of days per week with at least one scheduled dose (1-7)
 * @returns Estimated calendar days (rounded up)
 */
export function estimateDaysToXp(
  xpNeeded: number,
  currentStreak: number,
  doseDaysPerWeek: number,
): number {
  if (xpNeeded <= 0) return 0;
  if (doseDaysPerWeek <= 0) return 0;

  const doseRatio = Math.min(doseDaysPerWeek, 7) / 7;
  let accumulated = 0;
  let streak = currentStreak;
  let calendarDays = 0;
  // Track fractional dose-day accumulation for non-integer ratios
  let doseDayBudget = 0;

  while (accumulated < xpNeeded && calendarDays < 3650) {
    calendarDays++;
    doseDayBudget += doseRatio;

    if (doseDayBudget >= 1) {
      // This is a dose day
      doseDayBudget -= 1;
      streak++;
      const streakBonus = Math.min(XP_STREAK_MULT * streak, XP_STREAK_CAP);
      accumulated += XP_BASE + streakBonus;
    }
    // Non-dose day: streak preserved, no XP
  }

  return calendarDays;
}

/**
 * Compute the average number of dose-days per week across all active medications.
 * Returns 7 if any medication is daily; otherwise computes the union coverage.
 *
 * @param medications - Array of active, non-paused, non-archived medications
 * @returns Average dose-days per week (0-7)
 */
export function computeDoseDaysPerWeek(
  medications: Array<{
    frequency: string;
    custom_days: number[] | null;
    is_paused?: boolean;
    is_archived?: boolean;
    is_as_needed?: boolean;
  }>,
): number {
  const active = medications.filter(
    (m) => !m.is_paused && !m.is_archived && !m.is_as_needed,
  );
  if (active.length === 0) return 0;

  // If any med is daily, the user has doses every day
  if (active.some((m) => m.frequency === 'daily')) return 7;

  // Collect unique weekday coverage (0-6) from fixed-day schedules
  const coveredDays = new Set<number>();
  let hasVariableSchedule = false;
  let bestVariableRatio = 0;

  for (const med of active) {
    switch (med.frequency) {
      case 'mon_fri':
        for (let d = 0; d < 5; d++) coveredDays.add(d); // Mon-Fri
        break;

      case 'custom':
        if (med.custom_days && med.custom_days.length > 0) {
          for (const d of med.custom_days) {
            if (d >= 0 && d <= 6) coveredDays.add(d);
          }
        }
        break;

      case 'every_other_day': {
        hasVariableSchedule = true;
        // Custom interval stored as negative number in custom_days
        let interval = 2;
        if (med.custom_days && med.custom_days.length === 1 && med.custom_days[0] < 0) {
          interval = Math.abs(med.custom_days[0]);
        }
        const ratio = 7 / interval;
        bestVariableRatio = Math.max(bestVariableRatio, ratio);
        break;
      }
    }
  }

  // Fixed-day coverage is known exactly
  const fixedDays = coveredDays.size;

  if (!hasVariableSchedule) return fixedDays;

  // Variable schedules (every_other_day) don't map to fixed weekdays,
  // so we take the higher of fixed coverage or variable coverage estimate
  return Math.min(7, Math.max(fixedDays, Math.round(bestVariableRatio)));
}

/**
 * Get the raw XP constants for display or debugging.
 * SYNC: must match vision-backend gamification_service.py
 */
export const XP_CONSTANTS = {
  XP_BASE,
  XP_STREAK_MULT,
  XP_STREAK_CAP,
  COMEBACK_MULTIPLIER,
} as const;
