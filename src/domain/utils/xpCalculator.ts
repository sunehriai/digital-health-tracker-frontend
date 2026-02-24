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
 * Get the raw XP constants for display or debugging.
 * SYNC: must match vision-backend gamification_service.py
 */
export const XP_CONSTANTS = {
  XP_BASE,
  XP_STREAK_MULT,
  XP_STREAK_CAP,
  COMEBACK_MULTIPLIER,
} as const;
