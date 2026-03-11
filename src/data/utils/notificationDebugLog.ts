/**
 * Activity Debug Log
 *
 * Human-readable activity log written to vision-backend/logs/mobile_debug.log.
 * Each line is a single, readable sentence describing what happened.
 *
 * Toggle ACTIVITY_LOG_ENABLED to false before production builds.
 * All calls are no-ops when disabled (zero runtime overhead).
 */

import { API_BASE, ENDPOINTS } from '../api/endpoints';

// ━━━ Master Toggle ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Set to false for production builds.
const ACTIVITY_LOG_ENABLED = true;

// ━━━ Time Formatting ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Format Date to "3/10/25 11:00:00 PM" */
function formatTimestamp(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear() % 100;
  let h = date.getHours();
  const min = date.getMinutes().toString().padStart(2, '0');
  const sec = date.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${m}/${d}/${y} ${h}:${min}:${sec} ${ampm}`;
}

/** Format "14:00" → "2:00 PM" */
function formatDoseTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Format array of "HH:MM" strings → "10:00 AM, 2:00 PM" */
function formatDoseTimeList(times: string[]): string {
  return times.map(formatDoseTime).join(', ');
}

// ━━━ Batch Queue → Backend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let pendingLines: string[] = [];
let flushScheduled = false;
const FLUSH_INTERVAL_MS = 2000;

async function flushToBackend(): Promise<void> {
  if (pendingLines.length === 0) {
    flushScheduled = false;
    return;
  }

  const batch = pendingLines;
  pendingLines = [];
  flushScheduled = false;

  try {
    // Send as pre-formatted lines — backend writes them directly
    const entries = batch.map((line) => ({
      timestamp: '',
      category: '',
      action: line,
    }));
    await fetch(`${API_BASE}${ENDPOINTS.DEBUG_LOG}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
  } catch {
    // Backend unreachable — silently drop
  }
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(flushToBackend, FLUSH_INTERVAL_MS);
}

/** Write a pre-formatted line to the log. */
function writeLine(line: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  pendingLines.push(line);
  scheduleFlush();
  // Also log to console for dev
  console.log(`[ACTIVITY] ${line}`);
}

// Log startup to confirm module loaded (runs once per app launch)
let startupLogged = false;
if (ACTIVITY_LOG_ENABLED) {
  setTimeout(() => {
    if (startupLogged) return;
    startupLogged = true;
    writeLine(`${formatTimestamp(new Date())} - Activity Log Started`);
  }, 500);
}

// ━━━ Public API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Medication Added
 * e.g. "3/10/25 11:00:00 PM - Medication Added - 10XP - Vitamin D - 10:00 AM, 2:00 PM"
 */
export function logMedicationAdded(
  name: string,
  doseTimes: string[],
  xpAwarded?: number,
): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  const ts = formatTimestamp(new Date());
  const xp = xpAwarded ? ` - ${xpAwarded}XP` : '';
  const times = doseTimes.length > 0 ? ` - ${formatDoseTimeList(doseTimes)}` : '';
  writeLine(`${ts} - Medication Added${xp} - ${name}${times}`);
}

/**
 * Medication Updated
 * e.g. "3/10/25 11:00:00 PM - Medication Updated - Vitamin D"
 */
export function logMedicationUpdated(name: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Medication Updated - ${name}`);
}

/**
 * Medication Deleted
 * e.g. "3/10/25 11:00:00 PM - Medication Deleted - Vitamin D"
 */
export function logMedicationDeleted(name: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Medication Deleted - ${name}`);
}

/**
 * Medication Paused / Resumed / Archived / Restored
 * e.g. "3/10/25 11:00:00 PM - Medication Paused - Vitamin D"
 */
export function logMedicationAction(action: string, name: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Medication ${action} - ${name}`);
}

/**
 * Refill Logged
 * e.g. "3/10/25 11:00:00 PM - Refill Logged - Vitamin D - +30 doses (now 65)"
 */
export function logRefill(name: string, quantityAdded: number, newStock: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Refill Logged - ${name} - +${quantityAdded} doses (now ${newStock})`);
}

/**
 * Dose Logged (from app)
 * e.g. "3/10/25 11:00:00 PM - Dose Logged - taken - Vitamin D - 10:00 AM"
 */
export function logDoseLogged(
  medName: string,
  status: string,
  scheduledAt?: string,
): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  const ts = formatTimestamp(new Date());
  // Try to extract time from scheduledAt ISO string
  let timeStr = '';
  if (scheduledAt) {
    try {
      const d = new Date(scheduledAt);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      timeStr = ` - ${formatDoseTime(`${hh}:${mm}`)}`;
    } catch { /* skip */ }
  }
  writeLine(`${ts} - Dose Logged - ${status} - ${medName}${timeStr}`);
}

/**
 * Dose Logged via Notification action button
 * e.g. "3/10/25 11:00:00 PM - Dose Logged (notification) - taken - Vitamin D - 10:00 AM"
 */
export function logDoseViaNotification(
  medName: string,
  doseTime: string,
): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  const ts = formatTimestamp(new Date());
  let timeStr = '';
  try {
    const d = new Date(doseTime);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    timeStr = ` - ${formatDoseTime(`${hh}:${mm}`)}`;
  } catch { /* skip */ }
  writeLine(`${ts} - Dose Logged (notification) - taken - ${medName}${timeStr}`);
}

/**
 * Dose Batch Logged
 * e.g. "3/10/25 11:00:00 PM - Dose Batch Logged - 3/3 success"
 */
export function logDoseBatch(total: number, success: number, failed: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  const failStr = failed > 0 ? `, ${failed} failed` : '';
  writeLine(`${formatTimestamp(new Date())} - Dose Batch Logged - ${success}/${total} success${failStr}`);
}

/**
 * Dose Reverted
 * e.g. "3/10/25 11:00:00 PM - Dose Reverted - Vitamin D"
 */
export function logDoseReverted(medName: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Dose Reverted - ${medName}`);
}

/**
 * Dose auto-missed from max snooze
 * e.g. "3/10/25 11:00:00 PM - Dose Auto-Missed (max snooze) - Vitamin D"
 */
export function logDoseAutoMissed(medName: string): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Dose Auto-Missed (max snooze) - ${medName}`);
}

/**
 * Notification Scheduled (individual medication)
 * e.g. "3/10/25 11:00:00 PM - Notification Scheduled - Vitamin D - 10:00 AM (x30)"
 */
export function logNotificationScheduled(medName: string, doseTime: string, count: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  const countStr = count > 1 ? ` (x${count})` : '';
  writeLine(`${formatTimestamp(new Date())} - Notification Scheduled - ${medName} - ${formatDoseTime(doseTime)}${countStr}`);
}

/**
 * Reschedule Summary
 * e.g. "3/10/25 11:00:00 PM - Notifications Rescheduled - 12 scheduled, 8 cancelled"
 */
export function logRescheduleSummary(scheduled: number, cancelled: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Notifications Rescheduled - ${scheduled} scheduled, ${cancelled} cancelled`);
}

/**
 * Notification Snoozed
 * e.g. "3/10/25 11:00:00 PM - Notification Snoozed - Vitamin D - snooze 2/3"
 */
export function logNotificationSnoozed(medName: string, snoozeCount: number, maxSnooze: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Notification Snoozed - ${medName} - snooze ${snoozeCount}/${maxSnooze}`);
}

/**
 * Victory Card Displayed
 * e.g. "3/10/25 11:00:00 PM - Victory Card Displayed - 25XP - 3/3 doses"
 */
export function logVictoryCard(points: number, completed: number, total: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Victory Card Displayed - ${points}XP - ${completed}/${total} doses`);
}

/**
 * Action Center Displayed
 * e.g. "3/10/25 11:00:00 PM - Action Center Displayed - 2/3 doses"
 */
export function logActionCenter(completed: number, total: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Action Center Displayed - ${completed}/${total} doses`);
}

/**
 * Tier Up
 * e.g. "3/10/25 11:00:00 PM - Tier Up - Tier 2 (Initiate) - 500XP"
 */
export function logTierUp(newTier: number, tierName: string, totalXp: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Tier Up - Tier ${newTier} (${tierName}) - ${totalXp}XP`);
}

/**
 * Prefs Updated
 * e.g. "3/10/25 11:00:00 PM - Notification Prefs Updated - dose_reminders_enabled = true"
 */
export function logPrefsUpdated(field: string, value: unknown): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Notification Prefs Updated - ${field} = ${value}`);
}

/**
 * End of Day Summary (from cron/scheduler)
 * e.g. "3/10/25 11:00:00 PM - Notification Scheduled - End of Day - 3/3"
 */
export function logEndOfDay(completed: number, total: number): void {
  if (!ACTIVITY_LOG_ENABLED) return;
  writeLine(`${formatTimestamp(new Date())} - Notification Scheduled - End of Day - ${completed}/${total}`);
}

// ━━━ Backwards-compatible ndlog (used by existing call sites during migration) ━━━
// This is a no-op shim so existing imports don't break. All call sites will be updated.
export function ndlog(
  _category: string,
  _action: string,
  _details?: Record<string, unknown>,
): void {
  // no-op — replaced by specific log functions above
}

// ━━━ Utility ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Clear the backend log file.
 */
export async function clearLog(): Promise<void> {
  pendingLines = [];
  try {
    await fetch(`${API_BASE}${ENDPOINTS.DEBUG_LOG}`, { method: 'DELETE' });
  } catch {
    // best-effort
  }
}

/**
 * Force flush pending lines to backend.
 */
export async function forceFlush(): Promise<void> {
  await flushToBackend();
}

/**
 * Check if activity logging is enabled.
 */
export function isDebugEnabled(): boolean {
  return ACTIVITY_LOG_ENABLED;
}
