import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type {
  GamificationStatus,
  TierJourneyResponse,
  XpHistoryResponse,
  MilestonesResponse,
} from '../../domain/types';

export const gamificationService = {
  /**
   * GET /gamification/status
   * Fetches the current user's full gamification state:
   * total XP, tier, streak, waiver badges, boost status, etc.
   */
  async getStatus(): Promise<GamificationStatus> {
    return apiClient.request<GamificationStatus>(ENDPOINTS.GAMIFICATION_STATUS);
  },

  /**
   * GET /gamification/journey
   * Fetches the 5-tier progression path with unlock states.
   */
  async getJourney(): Promise<TierJourneyResponse> {
    return apiClient.request<TierJourneyResponse>(ENDPOINTS.GAMIFICATION_JOURNEY);
  },

  /**
   * GET /gamification/history?skip=N&limit=N
   * Fetches paginated XP event history for the current user.
   */
  async getHistory(skip: number = 0, limit: number = 20): Promise<XpHistoryResponse> {
    const query = `${ENDPOINTS.GAMIFICATION_HISTORY}?skip=${skip}&limit=${limit}`;
    return apiClient.request<XpHistoryResponse>(query);
  },

  /**
   * POST /gamification/waiver
   * Activates a Waiver Badge to protect the user's streak after a missed day.
   * Consumes one badge, converts yesterday's missed doses to taken_late.
   * Returns updated gamification status.
   */
  async activateWaiver(): Promise<GamificationStatus> {
    return apiClient.request<GamificationStatus>(ENDPOINTS.GAMIFICATION_WAIVER, {
      method: 'POST',
    });
  },

  /**
   * GET /gamification/milestones
   * Fetches monthly adherence milestones (3mo, 6mo, 12mo) with progress.
   */
  async getMilestones(): Promise<MilestonesResponse> {
    return apiClient.request<MilestonesResponse>(ENDPOINTS.GAMIFICATION_MILESTONES);
  },
};
