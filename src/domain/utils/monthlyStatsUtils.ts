/**
 * Computes monthly stats summary and motivational message
 * for the MonthlyStatsCard component.
 */

import type { MonthSummary, MonthlyStatsData } from '../types';

export function computeMonthlyStats(summary: MonthSummary): MonthlyStatsData {
  const { perfect_days, imperfect_days, total_scheduled_days, best_streak_days } = summary;

  const adherencePct =
    total_scheduled_days > 0
      ? Math.round(((perfect_days + imperfect_days) / total_scheduled_days) * 100)
      : 0;

  return {
    perfectDays: perfect_days,
    totalScheduledDays: total_scheduled_days,
    bestStreakDays: best_streak_days,
    adherencePct,
    motivationalMessage: getMotivationalMessage(adherencePct, total_scheduled_days),
  };
}

function getMotivationalMessage(pct: number, totalDays: number): string {
  if (totalDays === 0) return 'Start logging doses to see your progress!';
  if (pct >= 95) return "Outstanding! You're crushing it this month!";
  if (pct >= 80) return 'Great progress! Keep the momentum going!';
  if (pct >= 60) return 'Good effort! Every dose counts toward your goal.';
  if (pct >= 40) return "You're building a habit. Keep showing up!";
  if (pct >= 1) return "Every day is a fresh start. You've got this!";
  return 'Start logging doses to see your progress!';
}
