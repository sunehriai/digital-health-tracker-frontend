import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { WeeklyAdherenceResponse } from '../../domain/types';

export const adherenceWeeklyService = {
  async getWeeklyAdherence(): Promise<WeeklyAdherenceResponse> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const url = tz
      ? `${ENDPOINTS.ADHERENCE_WEEKLY}?timezone=${encodeURIComponent(tz)}`
      : ENDPOINTS.ADHERENCE_WEEKLY;
    return apiClient.request<WeeklyAdherenceResponse>(url);
  },
};
