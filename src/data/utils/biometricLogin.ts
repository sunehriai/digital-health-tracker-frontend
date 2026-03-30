/**
 * DEPRECATED — This file is a backward-compat shim.
 * Use biometricPrefs.ts for all new code.
 * This file will be deleted once all callers are migrated.
 */
import * as SecureStore from 'expo-secure-store';
import { biometricPrefs } from './biometricPrefs';

export const biometricLogin = {
  // Stub methods — credential storage removed in v3.0
  async storeCredentials(_email: string, _password: string): Promise<void> {},
  async getCredentials(): Promise<null> { return null; },
  async hasCreds(): Promise<boolean> { return false; },

  // One-time cleanup of stale SecureStore entry from v2.0
  async clearCredentials(): Promise<void> {
    try { await SecureStore.deleteItemAsync('vitalic_biometric_creds'); } catch {}
  },

  // Delegate to biometricPrefs
  async hasDeclined(): Promise<boolean> { return biometricPrefs.hasDeclined(); },
  async setDeclined(): Promise<void> { return biometricPrefs.setDeclined(); },
  async clearDeclined(): Promise<void> { await biometricPrefs.clearAll(); },
};
