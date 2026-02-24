import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { Profile, ProfileUpdate } from '../../domain/types';

export interface AuthUser extends Profile {
  email: string;
}

export const profileService = {
  async getMe(): Promise<AuthUser> {
    return apiClient.request<AuthUser>(ENDPOINTS.ME);
  },

  async updateMe(updates: ProfileUpdate): Promise<AuthUser> {
    return apiClient.request<AuthUser>(ENDPOINTS.ME, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};
