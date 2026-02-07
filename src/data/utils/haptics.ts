import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Light tap — e.g. button press, toggle */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium tap — e.g. dose confirmed */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Heavy tap — e.g. error, destructive action */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /** Success — e.g. dose taken, refill logged */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Warning — e.g. low stock */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  /** Error — e.g. action failed */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Selection change — e.g. picker, tab switch */
  selection: () => Haptics.selectionAsync(),
};
