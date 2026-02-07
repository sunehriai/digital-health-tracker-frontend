import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RevertableDose } from '../../domain/types';

const KEY_PREFIX = 'vision_dose_status_';
const REVERTABLE_KEY = 'vision_revertable_doses';

const getTodayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${KEY_PREFIX}${year}-${month}-${day}`;
};

export const doseStatusCache = {
  async getTakenToday(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(getTodayKey());
      if (!raw) return new Set();
      const ids: string[] = JSON.parse(raw);
      return new Set(ids);
    } catch {
      return new Set();
    }
  },

  async markTaken(medicationIds: string[]): Promise<void> {
    try {
      const existing = await this.getTakenToday();
      medicationIds.forEach((id) => existing.add(id));
      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(Array.from(existing)));
    } catch {
      // Silently fail — persistence is best-effort
    }
  },

  async markReverted(chipId: string): Promise<void> {
    try {
      const existing = await this.getTakenToday();
      existing.delete(chipId);
      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(Array.from(existing)));
    } catch (error) {
      // Best effort - will reconcile on next app open
      console.warn('Failed to update dose status cache on revert:', error);
    }
  },

  async cleanupOldData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const todayKey = getTodayKey();
      const doseKeys = keys.filter(
        (k) => k.startsWith(KEY_PREFIX) && k !== todayKey
      );
      if (doseKeys.length > 0) {
        await AsyncStorage.multiRemove(doseKeys);
      }
    } catch {
      // Silently fail
    }
  },

  // Revertable doses persistence
  async getRevertableDoses(): Promise<RevertableDose[]> {
    try {
      const raw = await AsyncStorage.getItem(REVERTABLE_KEY);
      if (!raw) return [];
      const stored = JSON.parse(raw);
      // Convert takenAt strings back to Date objects
      return stored.map((r: { chipId: string; doseId: string; medicationId: string; takenAt: string }) => ({
        ...r,
        takenAt: new Date(r.takenAt),
      }));
    } catch {
      return [];
    }
  },

  async addRevertableDose(entry: RevertableDose): Promise<void> {
    try {
      const existing = await this.getRevertableDoses();
      // Avoid duplicates
      if (!existing.find((r) => r.chipId === entry.chipId)) {
        existing.push(entry);
      }
      await AsyncStorage.setItem(REVERTABLE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to save revertable dose:', error);
    }
  },

  async removeRevertableDose(chipId: string): Promise<void> {
    try {
      const existing = await this.getRevertableDoses();
      const filtered = existing.filter((r) => r.chipId !== chipId);
      await AsyncStorage.setItem(REVERTABLE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to remove revertable dose:', error);
    }
  },

  async cleanupExpiredRevertables(): Promise<RevertableDose[]> {
    try {
      const REVERT_WINDOW_MS = 30 * 60 * 1000;
      const now = Date.now();
      const existing = await this.getRevertableDoses();
      const valid = existing.filter((r) => {
        const elapsed = now - r.takenAt.getTime();
        return elapsed < REVERT_WINDOW_MS;
      });
      await AsyncStorage.setItem(REVERTABLE_KEY, JSON.stringify(valid));
      return valid;
    } catch {
      return [];
    }
  },
};
