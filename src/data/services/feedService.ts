import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { VitalityFeedItem, VitalityFeedInsert } from '../../domain/types';

export const feedService = {
  async getAll(): Promise<VitalityFeedItem[]> {
    return apiClient.request(ENDPOINTS.FEED);
  },

  async create(data: VitalityFeedInsert): Promise<VitalityFeedItem> {
    return apiClient.request(ENDPOINTS.FEED, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async archive(id: string): Promise<VitalityFeedItem> {
    return apiClient.request(ENDPOINTS.FEED_ARCHIVE(id), { method: 'PUT' });
  },
};
