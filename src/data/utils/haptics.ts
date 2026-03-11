import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ── Module-level preference gate ───────────────────────────────────────
// Controlled by AppPreferencesContext via setHapticEnabled().
// When disabled, all haptic calls silently no-op.
let hapticEnabled = true;

export function setHapticEnabled(value: boolean): void {
  hapticEnabled = value;
}

const noop = async () => {};

function guard(fn: () => Promise<void>): () => Promise<void> {
  return () => {
    if (!hapticEnabled || Platform.OS === 'web') return noop();
    return fn().catch(() => {});
  };
}

export const haptics = {
  /** Light tap — e.g. button press, toggle */
  light: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Medium tap — e.g. dose confirmed */
  medium: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Heavy tap — e.g. error, destructive action */
  heavy: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Success — e.g. dose taken, refill logged */
  success: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Warning — e.g. low stock */
  warning: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Error — e.g. action failed */
  error: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** Selection change — e.g. picker, tab switch */
  selection: guard(() => Haptics.selectionAsync()),
};
