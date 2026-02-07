import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Medication } from '../../domain/types';

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

export const notifications = {
  /** Request permission and return Expo push token */
  async register(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('doses', {
        name: 'Dose Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D1FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('refills', {
        name: 'Refill Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#F59E0B',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  },

  /** Schedule a daily dose reminder */
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

  /** Schedule a low-stock refill alert */
  async scheduleRefillAlert(medication: Medication): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Low Stock Alert',
        body: `${medication.name} has only ${medication.current_stock} doses remaining. Consider refilling soon.`,
        data: { medicationId: medication.id, type: 'refill_alert' },
        ...(Platform.OS === 'android' && { channelId: 'refills' }),
      },
      trigger: null, // Send immediately
    });

    return id;
  },

  /** Cancel a scheduled notification */
  async cancel(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /** Cancel all scheduled notifications */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /** Add listener for received notifications (foreground) */
  onReceived(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  /** Add listener for notification taps */
  onTapped(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
