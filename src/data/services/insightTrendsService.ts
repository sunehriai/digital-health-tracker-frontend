import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { InsightTrendsResponse, YearlyTrendResponse } from '../../domain/types';

export const insightTrendsService = {
  async getTrends(refresh = false, weekOffset = 0): Promise<InsightTrendsResponse> {
    const params = new URLSearchParams();
    if (refresh) params.set('refresh', 'true');
    if (weekOffset !== 0) params.set('week_offset', String(weekOffset));
    const qs = params.toString();
    const url = qs ? `${ENDPOINTS.INSIGHT_TRENDS}?${qs}` : ENDPOINTS.INSIGHT_TRENDS;
    return apiClient.request<InsightTrendsResponse>(url);
  },

  async getYearlyTrend(year: number): Promise<YearlyTrendResponse> {
    return apiClient.request<YearlyTrendResponse>(
      `${ENDPOINTS.INSIGHT_YEARLY_TREND}?year=${year}`,
    );
  },
};
