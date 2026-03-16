/**
 * Shared adherence calculation utilities.
 *
 * Used by RitualTree (MyAdherenceScreen) and MonthlyScoreCard (InsightTrendsScreen).
 */

/**
 * Computes tree-growth percentage that reflects progress across the FULL month.
 *
 * Formula: (perfectDays * 1.0 + imperfectDays * 0.5) / daysInMonth * 100
 *
 * - Perfect days get full credit.
 * - Imperfect (delayed) days get half credit — tree grows slower.
 * - Missed days get zero credit.
 * - Denominator is total days in the month (28-31), NOT elapsed days.
 *
 * This means:
 *   Day 13/31 all perfect → 42%  (growing stage)
 *   Day 31/31 all perfect → 100% (full bloom)
 *   Day 31/31, 20 perfect + 5 delayed + 6 missed → 73%
 *
 * @param daysInMonth Total days in the calendar month (28-31).
 *   If omitted, falls back to elapsed-day ratio (legacy behavior).
 */
export function computeAdherencePct(
  perfectDays: number,
  imperfectDays: number,
  missedDays: number,
  daysInMonth?: number,
): number {
  // Legacy fallback when daysInMonth not provided
  if (daysInMonth == null) {
    const total = perfectDays + imperfectDays + missedDays;
    if (total === 0) return 0;
    return ((perfectDays + imperfectDays) / total) * 100;
  }

  if (daysInMonth <= 0) return 0;
  const score = perfectDays * 1.0 + imperfectDays * 0.5;
  return Math.min(100, (score / daysInMonth) * 100);
}

/** Returns the number of days in a given YYYY-MM month string. */
export function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
