/**
 * AI Consent Hook
 *
 * Manages user consent for AI medication scanning with AsyncStorage persistence.
 * Once consented, the user won't see the modal again (until they revoke in settings).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_STORAGE_KEY = '@vision/ai_consent';
const CONSENT_TIMESTAMP_KEY = '@vision/ai_consent_timestamp';

interface ConsentState {
  hasConsented: boolean;
  consentTimestamp: string | null;
  isLoading: boolean;
}

interface UseAIConsentReturn extends ConsentState {
  grantConsent: () => Promise<void>;
  revokeConsent: () => Promise<void>;
  checkConsent: () => Promise<boolean>;
}

/**
 * Hook for managing AI upload consent.
 *
 * Usage:
 * ```tsx
 * const { hasConsented, isLoading, grantConsent, revokeConsent } = useAIConsent();
 *
 * if (isLoading) return <LoadingSpinner />;
 *
 * if (!hasConsented) {
 *   return <ConsentModal onAgree={grantConsent} onDecline={onCancel} />;
 * }
 * ```
 */
export function useAIConsent(): UseAIConsentReturn {
  const [state, setState] = useState<ConsentState>({
    hasConsented: false,
    consentTimestamp: null,
    isLoading: true,
  });

  // Load consent state on mount
  useEffect(() => {
    loadConsentState();
  }, []);

  const loadConsentState = async () => {
    try {
      const [consentValue, timestampValue] = await Promise.all([
        AsyncStorage.getItem(CONSENT_STORAGE_KEY),
        AsyncStorage.getItem(CONSENT_TIMESTAMP_KEY),
      ]);

      setState({
        hasConsented: consentValue === 'true',
        consentTimestamp: timestampValue,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load AI consent state:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const grantConsent = useCallback(async () => {
    try {
      const timestamp = new Date().toISOString();

      await Promise.all([
        AsyncStorage.setItem(CONSENT_STORAGE_KEY, 'true'),
        AsyncStorage.setItem(CONSENT_TIMESTAMP_KEY, timestamp),
      ]);

      setState({
        hasConsented: true,
        consentTimestamp: timestamp,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to save AI consent:', error);
      throw error;
    }
  }, []);

  const revokeConsent = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CONSENT_STORAGE_KEY),
        AsyncStorage.removeItem(CONSENT_TIMESTAMP_KEY),
      ]);

      setState({
        hasConsented: false,
        consentTimestamp: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to revoke AI consent:', error);
      throw error;
    }
  }, []);

  const checkConsent = useCallback(async (): Promise<boolean> => {
    try {
      const consentValue = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
      return consentValue === 'true';
    } catch (error) {
      console.error('Failed to check AI consent:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    grantConsent,
    revokeConsent,
    checkConsent,
  };
}

/**
 * Simple hook to just check consent status without full state management.
 * Useful for conditional feature display.
 */
export function useHasAIConsent(): boolean | null {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_STORAGE_KEY)
      .then(value => setHasConsent(value === 'true'))
      .catch(() => setHasConsent(false));
  }, []);

  return hasConsent;
}
