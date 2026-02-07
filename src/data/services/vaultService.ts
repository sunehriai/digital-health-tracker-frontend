import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { EmergencyVault, EmergencyVaultUpsert } from '../../domain/types';

export const vaultService = {
  async get(): Promise<EmergencyVault | null> {
    return apiClient.request(ENDPOINTS.VAULT);
  },

  async update(data: EmergencyVaultUpsert): Promise<EmergencyVault> {
    return apiClient.request(ENDPOINTS.VAULT, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
