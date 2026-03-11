import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Silent on-launch cache cleanup utility.
 *
 * Uses an EXPLICIT ALLOWLIST — never prefix matching.
 * See Product_docs/async-storage-key-registry.md for the full key lifecycle.
 *
 * Only these keys are eligible for auto-cleanup:
 * - vision_revertable_doses: stale revertable dose data (90-day TTL)
 * - @vision_notification_prefs_pending: stale sync payloads (90-day TTL)
 */

const CLEANUP_ELIGIBLE_KEYS = [
  'vision_revertable_doses',
  '@vision_notification_prefs_pending',
];

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function runCacheCleanup(): Promise<void> {
  try {
    for (const key of CLEANUP_ELIGIBLE_KEYS) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        // Try to parse and check for a timestamp
        const parsed = JSON.parse(raw);

        // Check for a top-level timestamp field
        let timestamp: number | null = null;
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.timestamp === 'number') {
            timestamp = parsed.timestamp;
          } else if (typeof parsed.updatedAt === 'number') {
            timestamp = parsed.updatedAt;
          } else if (typeof parsed.created_at === 'number') {
            timestamp = parsed.created_at;
          }
        }

        // If no timestamp found, check if the value is an array with dated entries
        if (timestamp === null && Array.isArray(parsed) && parsed.length > 0) {
          // For arrays, check the most recent entry's timestamp
          const latest = parsed[parsed.length - 1];
          if (latest && typeof latest === 'object') {
            timestamp = latest.timestamp || latest.updatedAt || latest.created_at || null;
          }
        }

        // If we found a timestamp and it's older than 90 days, delete the key
        if (timestamp !== null) {
          const age = Date.now() - timestamp;
          if (age > NINETY_DAYS_MS) {
            await AsyncStorage.removeItem(key);
          }
        }
        // If no timestamp found, leave the key alone (don't delete without evidence of age)
      } catch {
        // Per-key error — continue with next key
      }
    }
  } catch {
    // Silently fail — cache cleanup is non-critical
  }
}
