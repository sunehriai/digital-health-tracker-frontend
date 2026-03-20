import { Platform } from 'react-native';

// Web always uses localhost; native platforms use EXPO_PUBLIC_API_URL
// (set to LAN IP for physical device, or falls back to emulator defaults).
const getApiBase = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Emulator defaults
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_BASE = getApiBase();

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
  REFILL_ACTIVITY: '/medications/refill-activity',
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

  // Adherence
  ADHERENCE_WEEKLY: '/adherence/weekly',
  ADHERENCE_CALENDAR: (yearMonth: string) => `/adherence/calendar?year_month=${yearMonth}`,
  ADHERENCE_QUICK_STATS: '/adherence/quick-stats',

  // Insight Trends
  INSIGHT_TRENDS: '/insights/trends',
  INSIGHT_YEARLY_TREND: '/insights/yearly-trend',

  // Debug (dev-only)
  DEBUG_LOG: '/debug/log',

  // Health
  HEALTH: '/health',
} as const;
