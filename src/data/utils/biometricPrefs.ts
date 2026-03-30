import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ENABLED: '@vitalic:biometric_enabled',
  DECLINED: '@vitalic:biometric_declined',
  LAST_EMAIL: '@vitalic:last_email',
  LAST_PROVIDER: '@vitalic:last_provider',
};

export const biometricPrefs = {
  // Biometric enabled preference
  async isEnabled(): Promise<boolean> {
    // Check new key first
    let val = await AsyncStorage.getItem(KEYS.ENABLED);
    if (val === null) {
      // Migrate from old key if it exists (Fix 7 — race-free migration)
      const oldVal = await AsyncStorage.getItem('@vision_biometric_enabled');
      if (oldVal === 'true') {
        await AsyncStorage.setItem(KEYS.ENABLED, 'true');
        await AsyncStorage.removeItem('@vision_biometric_enabled');
        return true;
      }
      return false;
    }
    return val === 'true';
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ENABLED, enabled ? 'true' : 'false');
  },

  // Declined opt-in prompt
  async hasDeclined(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.DECLINED);
    return val === 'true';
  },

  async setDeclined(): Promise<void> {
    await AsyncStorage.setItem(KEYS.DECLINED, 'true');
  },

  // Last email for fallback screen pre-fill
  async getLastEmail(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_EMAIL);
  },

  async setLastEmail(email: string): Promise<void> {
    // Never log the email value
    await AsyncStorage.setItem(KEYS.LAST_EMAIL, email);
  },

  // Last provider for fallback screen UI
  async getLastProvider(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_PROVIDER);
  },

  async setLastProvider(provider: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_PROVIDER, provider);
  },

  // Clear all preferences (called on sign-out)
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.ENABLED,
      KEYS.DECLINED,
      KEYS.LAST_EMAIL,
      KEYS.LAST_PROVIDER,
      '@vitalic:email_verify_dismissed',
      '@vitalic:age_gate_completed',
      // Also clean up old key if it somehow persists
      '@vision_biometric_enabled',
    ]);
  },
};
