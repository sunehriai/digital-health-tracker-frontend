import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore keys must be alphanumeric + dots/dashes/underscores only (no @ or :)
const CREDS_KEY = 'vitaquest_biometric_creds';
const DECLINED_KEY = '@vitaquest:biometric_declined'; // AsyncStorage allows any string

export const biometricLogin = {
  async storeCredentials(email: string, password: string): Promise<void> {
    await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify({ email, password }));
  },

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(CREDS_KEY);
  },

  async hasCreds(): Promise<boolean> {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    return !!raw;
  },

  async hasDeclined(): Promise<boolean> {
    const val = await AsyncStorage.getItem(DECLINED_KEY);
    return val === 'true';
  },

  async setDeclined(): Promise<void> {
    await AsyncStorage.setItem(DECLINED_KEY, 'true');
  },

  async clearDeclined(): Promise<void> {
    await AsyncStorage.removeItem(DECLINED_KEY);
  },
};
