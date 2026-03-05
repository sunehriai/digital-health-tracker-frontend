import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Medication, NotificationPreferences, MedicationNotificationOverride } from '../../domain/types';
import { medicationService } from '../services/medicationService';
import { doseStatusCache } from './doseStatusCache';
import { medicationEvents } from './medicationEvents';
import { getDoseTimes as getDoseTimesUtil } from '../../domain/utils/medicationUtils';

const MAX_SCHEDULED = 60;
const LOOKAHEAD_DAYS = 30;
const MAX_SNOOZE_COUNT = 3;

// ── Debug logging helper ──────────────────────────────────────────────
const NOTIF_DEBUG = true; // Set to false to disable debug logging
function nlog(...args: unknown[]) {
  if (NOTIF_DEBUG) console.log('[NOTIF-DEBUG]', ...args);
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize notification system: request permissions, set up channels and categories.
 * Call once at app startup.
 */
export async function initNotifications(): Promise<string | null> {
  nlog('initNotifications() called');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  nlog('Permission status:', existingStatus);

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    nlog('Requested permissions, new status:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    nlog('PERMISSION DENIED — notifications will NOT work');
    return null;
  }
  nlog('Permission GRANTED');

  // Android channels
  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync('doses', {
        name: 'Dose Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D1FF',
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync('refills', {
        name: 'Refill Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#F59E0B',
      }),
      Notifications.setNotificationChannelAsync('gamification', {
        name: 'Achievements & Progress',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#00D1FF',
      }),
      Notifications.setNotificationChannelAsync('system', {
        name: 'System & Safety',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#EF4444',
      }),
    ]);
  }

  // Register dose-reminder notification category with action buttons
  // Take runs in background (opensAppToForeground:false) for frictionless UX.
  // Accepted risk: ~20-30% silent failure on Android until Firebase/Notifee migration.
  // Skip removed — missed doses are handled automatically; users should pause instead.
  await Notifications.setNotificationCategoryAsync('dose-reminder', [
    { identifier: 'TAKE', buttonTitle: 'Take', options: { opensAppToForeground: false } },
    { identifier: 'SNOOZE', buttonTitle: 'Snooze', options: { opensAppToForeground: false } },
  ]);

  // Issue 16: Wrap push token retrieval with try/catch and explicit projectId
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (e) {
    console.warn('Could not get push token:', e);
    return null;
  }
}

// ── Preference Resolution ──────────────────────────────────────────────

function resolvePrefsForMedication(
  med: Medication,
  prefs: NotificationPreferences,
): { enabled: boolean; advanceMinutes: number } {
  const override: MedicationNotificationOverride | undefined = prefs.medication_overrides[med.id];
  return {
    enabled: override?.reminders_enabled ?? prefs.dose_reminders_enabled,
    advanceMinutes: override?.advance_minutes ?? prefs.advance_reminder_minutes,
  };
}

// ── Quiet Hours Filtering ──────────────────────────────────────────────

function isInQuietHours(date: Date, prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  const start = prefs.quiet_hours_start;
  const end = prefs.quiet_hours_end;

  // Midnight-spanning (e.g., 22:00–07:00)
  if (start > end) {
    return timeStr >= start || timeStr < end;
  }
  // Non-spanning (e.g., 13:00–15:00)
  return timeStr >= start && timeStr < end;
}

// ── Candidate Building ─────────────────────────────────────────────────

interface NotificationCandidate {
  date: Date;
  medication: Medication;
  doseTime: string; // Original HH:MM
  groupKey: string; // For OS grouping
}

// Use getDoseTimesUtil from domain/utils/medicationUtils (single source of truth)

/**
 * Issue 11: Use UTC date parts for day-diff calculations to avoid DST off-by-one.
 */
function utcDayDiff(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay - aDay) / (1000 * 60 * 60 * 24));
}

function shouldScheduleOnDay(med: Medication, date: Date): boolean {
  if (med.is_as_needed) return false;

  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  switch (med.frequency) {
    case 'daily':
      return true;
    case 'mon_fri':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'every_other_day': {
      const startDate = new Date(med.start_date);
      const diffDays = utcDayDiff(startDate, date);
      return diffDays >= 0 && diffDays % 2 === 0;
    }
    case 'custom': {
      if (!med.custom_days) return false;
      const firstDay = med.custom_days[0];
      if (firstDay < 0) {
        // Interval in days
        const interval = Math.abs(firstDay);
        const startDate = new Date(med.start_date);
        const diffDays = utcDayDiff(startDate, date);
        return diffDays >= 0 && diffDays % interval === 0;
      }
      return med.custom_days.includes(dayOfWeek);
    }
    default:
      return true;
  }
}

function buildSortedCandidates(
  medications: Medication[],
  prefs: NotificationPreferences,
): NotificationCandidate[] {
  const now = new Date();
  nlog('buildSortedCandidates() called at', now.toISOString());
  nlog('  medications count:', medications.length);
  nlog('  prefs.dose_reminders_enabled:', prefs.dose_reminders_enabled);
  nlog('  prefs.advance_reminder_minutes:', prefs.advance_reminder_minutes);
  nlog('  prefs.quiet_hours_enabled:', prefs.quiet_hours_enabled);
  if (prefs.quiet_hours_enabled) {
    nlog('  prefs.quiet_hours_start:', prefs.quiet_hours_start, 'end:', prefs.quiet_hours_end);
  }

  const candidates: NotificationCandidate[] = [];
  const endDate = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  for (const med of medications) {
    nlog('  Evaluating med:', med.name, '(id:', med.id, ')');
    nlog('    is_paused:', med.is_paused, 'is_archived:', med.is_archived, 'is_as_needed:', med.is_as_needed);
    nlog('    time_of_day:', med.time_of_day, 'dose_times:', med.dose_times);
    nlog('    frequency:', med.frequency, 'start_date:', med.start_date, 'end_date:', med.end_date);

    // Filter: active, non-paused, non-archived
    if (med.is_paused || med.is_archived) {
      nlog('    SKIPPED: paused or archived');
      continue;
    }

    // Check if medication has ended
    if (med.end_date && new Date(med.end_date) < now) {
      nlog('    SKIPPED: end_date in the past');
      continue;
    }

    const { enabled, advanceMinutes } = resolvePrefsForMedication(med, prefs);
    nlog('    resolved prefs: enabled=', enabled, 'advanceMinutes=', advanceMinutes);
    if (!enabled) {
      nlog('    SKIPPED: reminders disabled for this medication');
      continue;
    }

    const doseTimes = getDoseTimesUtil(med);
    nlog('    doseTimes resolved:', doseTimes);

    // Project forward day by day
    const currentDay = new Date(now);
    currentDay.setHours(0, 0, 0, 0);
    let medCandidateCount = 0;

    while (currentDay <= endDate) {
      if (shouldScheduleOnDay(med, currentDay)) {
        for (const timeStr of doseTimes) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const notifDate = new Date(currentDay);
          notifDate.setHours(hours, minutes, 0, 0);

          // Apply advance reminder offset
          notifDate.setMinutes(notifDate.getMinutes() - advanceMinutes);

          // Skip past notifications
          if (notifDate <= now) {
            // Only log for today to avoid spam
            if (currentDay.toDateString() === now.toDateString()) {
              nlog('    SKIP (past):', timeStr, '→ notifDate:', notifDate.toISOString(), '<= now:', now.toISOString());
            }
            continue;
          }

          // Check medication end date
          if (med.end_date && notifDate > new Date(med.end_date)) continue;

          // Quiet hours filtering
          if (isInQuietHours(notifDate, prefs)) {
            // Critical bypass check
            if (!(prefs.critical_bypass_quiet && med.is_critical)) {
              if (medCandidateCount < 3) {
                nlog('    SKIP (quiet hours):', notifDate.toISOString());
              }
              continue;
            }
          }

          candidates.push({
            date: notifDate,
            medication: med,
            doseTime: timeStr,
            groupKey: `dose_${timeStr}`,
          });
          medCandidateCount++;

          // Log first 3 candidates per med
          if (medCandidateCount <= 3) {
            nlog('    CANDIDATE:', timeStr, '→ trigger at', notifDate.toISOString());
          }
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
    nlog('    Total candidates for', med.name, ':', medCandidateCount);
  }

  // Sort chronologically
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  nlog('  Total candidates (all meds):', candidates.length);
  if (candidates.length > 0) {
    nlog('  First candidate:', candidates[0].medication.name, 'at', candidates[0].date.toISOString());
  }
  return candidates;
}

// ── Issue 10: Input hash for rescheduleAll caching ─────────────────────

let lastRescheduleHash: string | null = null;

function computeInputHash(medications: Medication[], prefs: NotificationPreferences): string {
  // Lightweight hash: combine IDs, pause/archive states, prefs toggles
  const medHash = medications
    .filter((m) => !m.is_paused && !m.is_archived)
    .map((m) => `${m.id}:${m.is_paused}:${m.is_archived}:${m.time_of_day}:${m.dose_times?.join(',')}:${m.frequency}`)
    .join('|');
  const prefsHash = `${prefs.dose_reminders_enabled}:${prefs.advance_reminder_minutes}:${prefs.quiet_hours_enabled}:${prefs.quiet_hours_start}:${prefs.quiet_hours_end}:${prefs.critical_bypass_quiet}:${JSON.stringify(prefs.medication_overrides)}`;
  return `${medHash}##${prefsHash}`;
}

// ── rescheduleAll ──────────────────────────────────────────────────────

/**
 * Issue 7: Atomic reschedule — calculate first, schedule new, then cancel old.
 * Issue 10: Skip reschedule if inputs haven't changed.
 */
export async function rescheduleAll(
  medications: Medication[],
  prefs: NotificationPreferences,
): Promise<void> {
  nlog('=== rescheduleAll() CALLED ===');
  nlog('  medications:', medications.length, 'prefs:', prefs ? 'loaded' : 'NULL');

  // Issue 10: Skip if nothing changed
  const inputHash = computeInputHash(medications, prefs);
  if (inputHash === lastRescheduleHash) {
    nlog('  SKIPPED: input hash unchanged (cached)');
    return;
  }
  nlog('  Hash changed, proceeding with reschedule');

  // Step 1: CALCULATE (safe, no side effects)
  const candidates = buildSortedCandidates(medications, prefs);
  nlog('  Candidates to schedule:', candidates.length);

  // Step 2: SCHEDULE new notifications first
  const newIds: string[] = [];
  let lastScheduledTime: Date | null = null;

  try {
    let scheduled = 0;
    for (const candidate of candidates) {
      if (scheduled >= MAX_SCHEDULED) break;

      const med = candidate.medication;
      const doseTimeIso = new Date(candidate.date);
      // Restore original scheduled time (before advance offset) for data
      doseTimeIso.setMinutes(doseTimeIso.getMinutes() + (
        resolvePrefsForMedication(med, prefs).advanceMinutes
      ));

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for your dose',
          body: `${med.name}${med.strength ? ` (${med.strength})` : ''} — ${med.dose_size} ${med.dose_unit || 'dose'}`,
          data: {
            type: 'dose_reminder',
            medicationId: med.id,
            doseTime: doseTimeIso.toISOString(),
            snoozeCount: 0,
          },
          sound: 'default',
          categoryIdentifier: 'dose-reminder',
          ...(Platform.OS === 'android' && {
            groupKey: candidate.groupKey,
          }),
          ...(Platform.OS === 'ios' && {
            threadId: candidate.groupKey,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: candidate.date,
          ...(Platform.OS === 'android' && { channelId: 'doses' }),
        },
      });

      newIds.push(id);
      lastScheduledTime = candidate.date;
      scheduled++;

      // Log first 5 scheduled
      if (scheduled <= 5) {
        nlog('  SCHEDULED #' + scheduled + ':', med.name, 'trigger:', candidate.date.toISOString(), 'id:', id);
      }
    }
    nlog('  Total scheduled:', scheduled);
  } catch (err) {
    nlog('  ERROR scheduling notifications:', err);
    // Rollback: cancel partially-scheduled new ones, leave existing intact
    for (const id of newIds) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* best-effort */ }
    }
    throw err;
  }

  // Step 3: Cancel OLD notifications only after new ones are safely scheduled
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  nlog('  Previously scheduled (OS):', allScheduled.length);
  const newIdSet = new Set(newIds);
  let cancelledCount = 0;
  for (const notif of allScheduled) {
    if (!newIdSet.has(notif.identifier)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        cancelledCount++;
      } catch { /* best-effort */ }
    }
  }
  nlog('  Cancelled old:', cancelledCount);

  // Step 4: NUDGE — if budget is full, schedule "Open Vision" reminder
  if (lastScheduledTime && newIds.length >= MAX_SCHEDULED) {
    const nudgeTime = new Date(lastScheduledTime.getTime() + 2 * 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Open Vision',
        body: 'Open Vision to keep your medication reminders active.',
        data: { type: 'nudge' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nudgeTime,
        ...(Platform.OS === 'android' && { channelId: 'system' }),
      },
    });
    nlog('  Nudge scheduled at:', nudgeTime.toISOString());
  }

  // Update cache hash after successful reschedule
  lastRescheduleHash = inputHash;

  // VERIFICATION: Query OS for what's actually scheduled
  const verifyScheduled = await Notifications.getAllScheduledNotificationsAsync();
  nlog('=== VERIFICATION: OS has', verifyScheduled.length, 'scheduled notifications ===');
  for (let i = 0; i < Math.min(verifyScheduled.length, 5); i++) {
    const n = verifyScheduled[i];
    const trigger = n.trigger as { type?: string; value?: number; date?: number };
    const triggerDate = trigger.value ? new Date(trigger.value) : trigger.date ? new Date(trigger.date) : 'unknown';
    nlog('  OS notif', i + 1, ':', n.content.title, '|', n.content.body, '| trigger:', triggerDate);
  }
  nlog('=== rescheduleAll() COMPLETE ===');
}

// ── Notification Action Helpers ────────────────────────────────────────

/**
 * Derive the carousel chipId from notification data so doseStatusCache
 * can be updated without opening the app.
 *
 * chipId format: multi-dose → `{medId}_dose_{N}`, single-dose → `{medId}`
 */
function deriveChipId(medication: Medication, doseTimeIso: string): string {
  const doseTimes = getDoseTimesUtil(medication);
  if (doseTimes.length <= 1) {
    return medication.id;
  }
  // Extract HH:MM from the ISO string
  const d = new Date(doseTimeIso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  const idx = doseTimes.indexOf(timeStr);
  if (idx >= 0) {
    return `${medication.id}_dose_${idx}`;
  }
  // Fallback: no match found, use base id
  return medication.id;
}

// ── Notification Action Handlers ───────────────────────────────────────

/**
 * Issue 6: Accept getter functions instead of snapshots, so prefs/meds are
 * always read at call time, not at registration time.
 *
 * Issue 14: Validate medicationId against loaded medications.
 * Issue 13 (doseTime): Validate ISO date format before API call.
 */
export function registerNotificationActionHandler(
  getPrefs: () => NotificationPreferences | null,
  getMedications: () => Medication[],
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    const actionId = response.actionIdentifier;
    const data = response.notification.request.content.data as {
      type?: string;
      medicationId?: string;
      doseTime?: string;
      snoozeCount?: number;
    };

    if (data.type !== 'dose_reminder' || !data.medicationId || !data.doseTime) {
      return;
    }

    const { medicationId, doseTime, snoozeCount = 0 } = data;

    // Issue 13 (doseTime validation): Verify ISO date is parseable
    const parsedDate = new Date(doseTime);
    if (isNaN(parsedDate.getTime())) {
      console.warn('Invalid doseTime in notification payload:', doseTime);
      return;
    }

    // Issue 14: Verify medication belongs to current user's loaded medications
    const medications = getMedications();
    const med = medications.find((m) => m.id === medicationId);
    if (!med) {
      console.warn('Notification action for unknown medication:', medicationId);
      return;
    }

    // Issue 6: Read prefs at call time, not registration time
    const prefs = getPrefs();

    try {
      switch (actionId) {
        case 'TAKE': {
          // Dismiss the original notification immediately so it doesn't linger
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier,
          );

          // logDose is the critical API call — if it fails, show error notification
          await medicationService.logDose(medicationId, {
            scheduled_at: doseTime,
            status: 'taken',
          });

          // Post-logDose side effects: failures here are non-critical
          // (dose is already recorded server-side)
          try {
            // Update dose status cache so carousel shows tick on next app open
            const chipId = deriveChipId(med, doseTime);
            await doseStatusCache.markTaken([chipId]);
          } catch (cacheErr) {
            console.warn('Post-logDose cache error (dose IS logged):', cacheErr);
          }

          // Emit outside inner try — must fire even if cache write failed
          medicationEvents.emit('dose_taken', medicationId);

          // Show success notification (app isn't open, so toast won't be visible)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Dose Logged',
              body: `${med.name} dose logged successfully`,
              sound: false, // silent — visual confirmation only
              ...(Platform.OS === 'android' && { channelId: 'doses' }),
            },
            trigger: null, // show immediately
          });
          break;
        }

        case 'SNOOZE': {
          // Dismiss the original notification immediately
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier,
          );

          if (snoozeCount >= MAX_SNOOZE_COUNT) {
            // Max snoozes reached — log as missed
            await medicationService.logDose(medicationId, {
              scheduled_at: doseTime,
              status: 'missed',
            });
          } else if (prefs?.snooze_enabled) {
            // Schedule snoozed re-notification
            const snoozeMs = (prefs.snooze_duration_minutes || 10) * 60 * 1000;
            const snoozeDate = new Date(Date.now() + snoozeMs);
            const origContent = response.notification.request.content;

            await Notifications.scheduleNotificationAsync({
              content: {
                title: origContent.title ?? 'Time for your dose',
                body: origContent.body ?? '',
                sound: 'default',
                categoryIdentifier: 'dose-reminder',
                data: {
                  ...data,
                  snoozeCount: snoozeCount + 1,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: snoozeDate,
                ...(Platform.OS === 'android' && { channelId: 'doses' }),
              },
            });
          }
          break;
        }

        default:
          // Notification body tap — app will open to foreground naturally
          break;
      }
    } catch (err) {
      console.warn('Notification action handler error:', err);
      // Only show error notification for TAKE — the logDose API call itself failed
      if (actionId === 'TAKE') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Action Failed',
            body: 'Could not log dose. Please open Vision and try again.',
            sound: false,
            ...(Platform.OS === 'android' && { channelId: 'doses' }),
          },
          trigger: null,
        });
      }
    }

    // Reschedule to fill freed slot
    if (prefs && actionId === 'TAKE') {
      try {
        // Invalidate cache so reschedule actually runs (a dose was just consumed)
        lastRescheduleHash = null;
        await rescheduleAll(medications, prefs);
      } catch {
        // Non-critical — will reschedule on next foreground
      }
    }
  });
}

// ── Legacy API (backwards compatibility) ───────────────────────────────

export const notifications = {
  async register(): Promise<string | null> {
    return initNotifications();
  },

  async scheduleDoseReminder(medication: Medication): Promise<string> {
    const [hours, minutes] = medication.time_of_day.split(':').map(Number);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your dose',
        body: `${medication.name}${medication.strength ? ` (${medication.strength})` : ''} — ${medication.dose_size} dose`,
        data: { medicationId: medication.id, type: 'dose_reminder' },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'doses' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    return id;
  },

  async scheduleRefillAlert(medication: Medication): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Low Stock Alert',
        body: `${medication.name} has only ${medication.current_stock} doses remaining. Consider refilling soon.`,
        data: { medicationId: medication.id, type: 'refill_alert' },
        ...(Platform.OS === 'android' && { channelId: 'refills' }),
      },
      trigger: null,
    });

    return id;
  },

  async cancel(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  onReceived(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  onTapped(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
