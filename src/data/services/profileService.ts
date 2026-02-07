import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { Profile } from '../../domain/types';

export interface AuthUser extends Profile {
  email: string;
}

export const profileService = {
  async getMe(): Promise<AuthUser> {
    return apiClient.request<AuthUser>(ENDPOINTS.ME);
  },

  async updateMe(updates: Partial<Pick<Profile, 'display_name' | 'vitality_streak'>>): Promise<AuthUser> {
    return apiClient.request<AuthUser>(ENDPOINTS.ME, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};
