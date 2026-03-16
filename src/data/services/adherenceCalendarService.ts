import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { MonthAdherenceResponse, QuickStatsResponse } from '../../domain/types';

export const adherenceCalendarService = {
  async getCalendar(yearMonth: string): Promise<MonthAdherenceResponse> {
    return apiClient.request<MonthAdherenceResponse>(ENDPOINTS.ADHERENCE_CALENDAR(yearMonth));
  },

  async getQuickStats(): Promise<QuickStatsResponse> {
    return apiClient.request<QuickStatsResponse>(ENDPOINTS.ADHERENCE_QUICK_STATS);
  },
};
