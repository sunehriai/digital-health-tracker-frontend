import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSecurity } from './useSecurity';
import {
  SENSITIVE_SCREENS,
  ALL_PROTECTED_SCREENS,
} from '../../domain/constants/screenSecurity';

// expo-screen-capture requires a development build (native module).
// In Expo Go the module doesn't exist, so we guard with try/catch.
let ScreenCapture: typeof import('expo-screen-capture') | null = null;
try {
  ScreenCapture = require('expo-screen-capture');
} catch {
  // Native module not available (Expo Go) — all calls will be skipped
}

/**
 * Per-screen hook for screenshot/recording prevention.
 * Call as `useScreenSecurity('ScreenName')` at the top of each protected screen.
 *
 * Returns `{ showScreenshotToast, dismissScreenshotToast }` for rendering
 * the ScreenshotToast component.
 */
export function useScreenSecurity(screenName: string) {
  const {
    screenSecurityEnabled,
    screenSecurityGranularity,
    devForceScreenSecurity,
  } = useSecurity();

  const [showScreenshotToast, setShowScreenshotToast] = useState(false);
  const hasShownToastRef = useRef(false);
  const navigation = useNavigation();

  const dismissScreenshotToast = useCallback(() => {
    setShowScreenshotToast(false);
  }, []);

  useEffect(() => {
    // Skip on web or if native module is unavailable (Expo Go)
    if (Platform.OS === 'web' || !ScreenCapture) return;

    // Skip if screen security is disabled
    if (!screenSecurityEnabled) return;

    // Skip in dev mode unless force-enabled
    if (__DEV__ && !devForceScreenSecurity) {
      console.log(
        `[ScreenSecurity] Disabled in development mode for ${screenName}`,
      );
      return;
    }

    // Check if this screen should be protected based on granularity
    const isProtected =
      screenSecurityGranularity === 'all'
        ? ALL_PROTECTED_SCREENS.has(screenName)
        : SENSITIVE_SCREENS.has(screenName);

    if (!isProtected) return;

    // Capture a local ref so cleanup always refers to the same module
    const SC = ScreenCapture;
    let screenshotSub: { remove: () => void } | null = null;

    // Prevent screen capture (Android: FLAG_SECURE, iOS: prevents screenshots on 13+)
    SC.preventScreenCaptureAsync(screenName).catch((e) => {
      console.warn(`[ScreenSecurity] preventScreenCaptureAsync failed for ${screenName}:`, e);
    });

    // Register screenshot listener (fires when user takes a screenshot)
    try {
      screenshotSub = SC.addScreenshotListener(() => {
        if (!hasShownToastRef.current) {
          hasShownToastRef.current = true;
          setShowScreenshotToast(true);
        }
      });
    } catch (e) {
      console.warn(`[ScreenSecurity] addScreenshotListener failed for ${screenName}:`, e);
    }

    // On blur: release capture prevention and remove listener
    const unsubBlur = navigation.addListener('blur', () => {
      hasShownToastRef.current = false;
      setShowScreenshotToast(false);
      SC.allowScreenCaptureAsync(screenName).catch(() => {});
      if (screenshotSub) {
        screenshotSub.remove();
        screenshotSub = null;
      }
    });

    return () => {
      hasShownToastRef.current = false;
      SC.allowScreenCaptureAsync(screenName).catch(() => {});
      if (screenshotSub) {
        screenshotSub.remove();
      }
      unsubBlur();
    };
  }, [
    screenName,
    screenSecurityEnabled,
    screenSecurityGranularity,
    devForceScreenSecurity,
    navigation,
  ]);

  return { showScreenshotToast, dismissScreenshotToast };
}
