import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { NotificationPreferences, NotificationPreferencesUpdate } from '../../domain/types';

export const notificationPreferencesService = {
  async get(): Promise<NotificationPreferences> {
    return apiClient.request(ENDPOINTS.NOTIFICATION_PREFERENCES);
  },

  async update(data: NotificationPreferencesUpdate): Promise<NotificationPreferences> {
    return apiClient.request(ENDPOINTS.NOTIFICATION_PREFERENCES, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
