import { Platform } from 'react-native';

// Default to localhost for dev; override via environment or config
// 10.0.2.2 is Android emulator's localhost, use 127.0.0.1 for web/iOS
const getDefaultApiBase = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  // For web and iOS, use localhost directly
  return 'http://localhost:8000';
};

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || getDefaultApiBase();

export const ENDPOINTS = {
  // Auth / Profile
  ME: '/auth/me',

  // Medications
  MEDICATIONS: '/medications',
  MEDICATION: (id: string) => `/medications/${id}`,
  MEDICATION_PAUSE: (id: string) => `/medications/${id}/pause`,
  MEDICATION_RESUME: (id: string) => `/medications/${id}/resume`,
  MEDICATION_ARCHIVE: (id: string) => `/medications/${id}/archive`,
  MEDICATION_RESTORE: (id: string) => `/medications/${id}/restore`,
  MEDICATION_REFILL: (id: string) => `/medications/${id}/refill`,
  MEDICATION_DOSES: (id: string) => `/medications/${id}/doses`,
  MEDICATION_DOSE_REVERT: (medicationId: string, doseId: string) =>
    `/medications/${medicationId}/doses/${doseId}`,

  // Feed
  FEED: '/feed',
  FEED_ARCHIVE: (id: string) => `/feed/${id}/archive`,

  // Vault
  VAULT: '/vault',

  // AI Analysis
  AI_ANALYZE: '/ai/analyze-image',
  AI_PROVIDER_METADATA: '/ai/provider-metadata',

  // Gamification
  GAMIFICATION_STATUS: '/gamification/status',
  GAMIFICATION_JOURNEY: '/gamification/journey',
  GAMIFICATION_HISTORY: '/gamification/history',
  GAMIFICATION_WAIVER: '/gamification/waiver',
  GAMIFICATION_MILESTONES: '/gamification/milestones',

  // Notification Preferences
  NOTIFICATION_PREFERENCES: '/notifications/preferences',
  DAY_SETTLED: '/notifications/day-settled',

  // Device Tokens (Push Notifications)
  DEVICE_TOKENS: '/device-tokens',
  DEVICE_TOKEN_DELETE: (token: string) => `/device-tokens/${encodeURIComponent(token)}`,

  // Deletion
  DELETION_REQUEST: '/auth/me/delete',
  DELETION_CANCEL: '/auth/me/cancel-delete',
  DELETION_STATUS: '/auth/me/deletion-status',

  // Export
  EXPORT_HEALTH_REPORT: '/export/health-report',

  // Health
  HEALTH: '/health',
} as const;
