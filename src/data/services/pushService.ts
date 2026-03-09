/**
 * Push notification service — FCM token registration and backend sync.
 *
 * BP-017: Does NOT independently call requestPermissionsAsync().
 * Permission must already be granted by the local notification flow
 * in useNotificationScheduler before this service is used.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PushService');

/**
 * Get the device push token (FCM on Android, APNs on iOS).
 * Returns null if unavailable (e.g., simulator, permissions not granted).
 */
async function getDevicePushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return token.data as string;
  } catch (error) {
    logger.warn('Failed to get device push token (may be simulator)', { error });
    return null;
  }
}

/**
 * Register the device push token with the backend.
 * Idempotent — backend upserts on (user_id, token).
 */
export async function registerToken(): Promise<void> {
  const token = await getDevicePushToken();
  if (!token) {
    logger.info('No push token available — skipping registration');
    return;
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await apiClient.request(ENDPOINTS.DEVICE_TOKENS, {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
    logger.info('Push token registered with backend');
  } catch (error) {
    logger.error('Failed to register push token', error as Error);
  }
}

/**
 * Unregister the current device push token from the backend.
 * Called on sign-out to stop receiving push notifications.
 */
export async function unregisterToken(): Promise<void> {
  const token = await getDevicePushToken();
  if (!token) return;

  try {
    await apiClient.request(ENDPOINTS.DEVICE_TOKEN_DELETE(token), {
      method: 'DELETE',
    });
    logger.info('Push token unregistered from backend');
  } catch (error) {
    logger.error('Failed to unregister push token', error as Error);
  }
}
