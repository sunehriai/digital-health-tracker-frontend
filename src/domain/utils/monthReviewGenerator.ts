import type { MonthSummary } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = MONTH_NAMES[d.getMonth()].substring(0, 3);
  return `${month} ${d.getDate()}`;
}

function getPrevMonthName(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  return MONTH_NAMES[prevMonth - 1];
}

/**
 * Generates a single motivational review sentence for the month.
 * Priority: empty > first month > streak > comparison > fallback.
 */
export function generateReviewSentence(
  summary: MonthSummary,
  yearMonth: string,
): string {
  // 1. No medications scheduled
  if (summary.total_scheduled_days === 0) {
    return 'No medications scheduled this month.';
  }

  // 2. First month (no previous data)
  if (summary.prev_month_adherence_pct === null) {
    return 'First full month — welcome to the journey!';
  }

  // 3. Notable streak
  if (
    summary.best_streak_days >= 7 &&
    summary.best_streak_start &&
    summary.best_streak_end
  ) {
    const start = formatDateShort(summary.best_streak_start);
    const end = formatDateShort(summary.best_streak_end);
    return `Your best streak this month: ${summary.best_streak_days} days (${start}\u2013${end}).`;
  }

  // 4. Comparison with previous month
  if (summary.prev_month_adherence_pct !== null) {
    const currentDayPct =
      summary.total_scheduled_days > 0
        ? ((summary.perfect_days + summary.imperfect_days) /
            summary.total_scheduled_days) *
          100
        : 0;
    if (currentDayPct > summary.prev_month_adherence_pct) {
      const weekdayClause = summary.strongest_weekday
        ? ` \u2014 ${summary.strongest_weekday} is your strongest day.`
        : '.';
      return `More adherent days than ${getPrevMonthName(yearMonth)}${weekdayClause}`;
    }
    if (summary.best_streak_days > 0) {
      return `Your best streak this month: ${summary.best_streak_days} days.`;
    }
  }

  // 5. Fallback
  return `${summary.perfect_days} days with complete adherence this month.`;
}
