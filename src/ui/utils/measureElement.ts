import { Platform } from 'react-native';

/**
 * Cross-platform element measurement.
 * On native: uses measureInWindow.
 * On web: uses getBoundingClientRect.
 */
export function measureElement(
  target: any,
  callback: (x: number, y: number, width: number, height: number) => void
) {
  if (Platform.OS === 'web') {
    // On web, target is a DOM element
    try {
      const node = target as HTMLElement;
      if (node && node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        callback(rect.x, rect.y, rect.width, rect.height);
      }
    } catch {}
  } else {
    // On native, use measureInWindow
    target?.measureInWindow?.(callback);
  }
}
