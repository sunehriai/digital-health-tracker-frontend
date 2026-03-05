import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { deletionService, DeletionStatusResponse } from '../../data/services/deletionService';
import { medicationEvents } from '../../data/utils/medicationEvents';

const TAG = '[useDeletion]';

interface UseDeletionReturn {
  loading: boolean;
  error: string | null;
  requestDeletion: (type: 'data_only' | 'full_account') => Promise<boolean>;
  cancelDeletion: () => Promise<boolean>;
  getDeletionStatus: () => Promise<DeletionStatusResponse | null>;
  clearAllLocalCaches: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook encapsulating all deletion logic (R12: Clean Architecture compliance).
 * Handles API calls, local cache cleanup, loading/error state.
 */
export function useDeletion(): UseDeletionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * R3 fix: Clear ALL vision_* and @vision/* AsyncStorage keys.
   * Preserves device security settings (biometric, auto-lock, screen security)
   * but clears all health data caches.
   */
  const clearAllLocalCaches = useCallback(async () => {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Security settings that must survive data clear
      const PRESERVED_KEYS = new Set([
        '@vision_biometric_enabled',
        '@vision_auto_lock_timeout',
        '@vision_screen_security',
        '@vision_screen_security_granularity',
      ]);

      const allKeys = await AsyncStorage.getAllKeys();
      const visionKeys = allKeys.filter(
        (key) =>
          !PRESERVED_KEYS.has(key) &&
          (key.startsWith('vision_') ||
           key.startsWith('@vision') ||
           key.startsWith('@dose_status_cache'))
      );
      if (visionKeys.length > 0) {
        await AsyncStorage.multiRemove(visionKeys);
      }
    } catch (e) {
      // Non-critical — log but don't fail the deletion flow
      console.warn('Failed to clear local caches:', e);
    }
  }, []);

  const requestDeletion = useCallback(
    async (type: 'data_only' | 'full_account'): Promise<boolean> => {
      console.log(`${TAG} requestDeletion called — type: ${type}`);
      setLoading(true);
      setError(null);
      try {
        console.log(`${TAG} calling deletionService.requestDeletion...`);
        const response = await deletionService.requestDeletion(type);
        console.log(`${TAG} deletionService.requestDeletion succeeded:`, JSON.stringify(response));
        await clearAllLocalCaches();
        if (type === 'data_only') {
          medicationEvents.emit('all_data_deleted', '');
        }
        console.log(`${TAG} local caches cleared, returning true`);
        return true;
      } catch (e: any) {
        const message = e.message || 'Failed to request deletion. Please check your connection and try again.';
        console.error(`${TAG} requestDeletion FAILED — error:`, e);
        console.error(`${TAG} error message:`, message);
        console.error(`${TAG} error stack:`, e.stack);
        setError(message);
        return false;
      } finally {
        setLoading(false);
        console.log(`${TAG} requestDeletion finished — loading set to false`);
      }
    },
    [clearAllLocalCaches],
  );

  const cancelDeletion = useCallback(async (): Promise<boolean> => {
    console.log(`${TAG} cancelDeletion called`);
    setLoading(true);
    setError(null);
    try {
      const response = await deletionService.cancelDeletion();
      console.log(`${TAG} cancelDeletion succeeded:`, JSON.stringify(response));
      return true;
    } catch (e: any) {
      const message = e.message || 'Failed to cancel deletion. Please try again.';
      console.error(`${TAG} cancelDeletion FAILED:`, e);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDeletionStatus = useCallback(async (): Promise<DeletionStatusResponse | null> => {
    try {
      return await deletionService.getDeletionStatus();
    } catch {
      return null;
    }
  }, []);

  return {
    loading,
    error,
    requestDeletion,
    cancelDeletion,
    getDeletionStatus,
    clearAllLocalCaches,
    clearError,
  };
}
