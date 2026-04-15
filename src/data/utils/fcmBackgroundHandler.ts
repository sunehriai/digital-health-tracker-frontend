/**
 * FCM Background Handler — processes data-only FCM messages in headless context.
 *
 * Must be imported at module scope (App.tsx) before initNotifications().
 * Uses AsyncStorage directly (no React state available in headless context).
 *
 * Data-only FCM messages contain only medicationId, doseTime, type —
 * never medication names. The handler reads the local medication cache
 * and privacy toggle to construct the notification body on-device.
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getMedNameToggle, getMedicationCache } from './notifications';

const FCM_BACKGROUND_TASK = 'FCM_BACKGROUND_HANDLER';

TaskManager.defineTask(FCM_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[FCM-BG] Task error:', error);
    return;
  }

  if (!data) return;

  // Extract FCM data payload — structure varies by platform
  const payload = (data as any)?.data ?? (data as any)?.notification?.data ?? data;
  const { medicationId, doseTime, type } = payload as {
    medicationId?: string;
    doseTime?: string;
    type?: string;
  };

  if (!type) return; // Not a Vitalic message

  try {
    // Read privacy toggle and medication cache from AsyncStorage
    const showNames = await getMedNameToggle();
    const medications = await getMedicationCache();
    const med = medicationId
      ? medications.find((m) => m.id === medicationId)
      : null;

    // Construct body based on toggle + cache
    let body = 'Time for your dose';
    if (showNames && med) {
      body = `${med.name}${med.strength ? ` (${med.strength})` : ''} — ${med.dose_size} ${(med as any).dose_unit || 'dose'}`;
    }

    // Schedule immediate local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your dose',
        body,
        data: { type, medicationId, doseTime, snoozeCount: 0 },
        sound: 'default',
        categoryIdentifier: type === 'dose_reminder' ? 'dose-reminder' : undefined,
        ...(Platform.OS === 'android' && {
          channelId: type === 'dose_reminder' ? 'doses' : type === 'refill_alert' ? 'refills' : type === 'gamification' ? 'gamification' : 'system',
        }),
      },
      trigger: null, // Immediate
    });
  } catch (err) {
    console.warn('[FCM-BG] Handler error:', err);
  }
});

export { FCM_BACKGROUND_TASK };
