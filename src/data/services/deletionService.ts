import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { API_BASE } from '../api/endpoints';

const TAG = '[deletionService]';

export interface DeletionResponse {
  status: string;
  deletion_type: string;
  deletion_requested_at: string;
  permanent_deletion_date: string;
  message: string;
}

export interface DeletionStatusResponse {
  pending: boolean;
  deletion_type: string | null;
  deletion_requested_at: string | null;
  permanent_deletion_date: string | null;
  days_remaining: number | null;
}

export interface CancelDeletionResponse {
  status: string;
  message: string;
}

export const deletionService = {
  async requestDeletion(deletionType: 'data_only' | 'full_account'): Promise<DeletionResponse> {
    const url = `${API_BASE}${ENDPOINTS.DELETION_REQUEST}`;
    const payload = { deletion_type: deletionType };
    console.log(`${TAG} requestDeletion — URL: ${url}`);
    console.log(`${TAG} requestDeletion — payload:`, JSON.stringify(payload));
    try {
      const result = await apiClient.request<DeletionResponse>(ENDPOINTS.DELETION_REQUEST, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      console.log(`${TAG} requestDeletion — response:`, JSON.stringify(result));
      return result;
    } catch (e) {
      console.error(`${TAG} requestDeletion — threw:`, e);
      throw e;
    }
  },

  async cancelDeletion(): Promise<CancelDeletionResponse> {
    console.log(`${TAG} cancelDeletion — URL: ${API_BASE}${ENDPOINTS.DELETION_CANCEL}`);
    try {
      const result = await apiClient.request<CancelDeletionResponse>(ENDPOINTS.DELETION_CANCEL, {
        method: 'POST',
      });
      console.log(`${TAG} cancelDeletion — response:`, JSON.stringify(result));
      return result;
    } catch (e) {
      console.error(`${TAG} cancelDeletion — threw:`, e);
      throw e;
    }
  },

  async getDeletionStatus(): Promise<DeletionStatusResponse> {
    console.log(`${TAG} getDeletionStatus — URL: ${API_BASE}${ENDPOINTS.DELETION_STATUS}`);
    try {
      const result = await apiClient.request<DeletionStatusResponse>(ENDPOINTS.DELETION_STATUS);
      console.log(`${TAG} getDeletionStatus — response:`, JSON.stringify(result));
      return result;
    } catch (e) {
      console.error(`${TAG} getDeletionStatus — threw:`, e);
      throw e;
    }
  },
};
