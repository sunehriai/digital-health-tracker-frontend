import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { WeeklyAdherenceResponse } from '../../domain/types';

export const adherenceWeeklyService = {
  async getWeeklyAdherence(): Promise<WeeklyAdherenceResponse> {
    return apiClient.request<WeeklyAdherenceResponse>(ENDPOINTS.ADHERENCE_WEEKLY);
  },
};
