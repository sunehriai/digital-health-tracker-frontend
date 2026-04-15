import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, useAuthProvider } from './ui/hooks/useAuth';
import { GamificationContext, useGamificationProvider } from './ui/hooks/useGamification';
import { SecurityContext, useSecurityProvider } from './ui/hooks/useSecurity';
import { AppPreferencesContext, useAppPreferencesProvider, useAppPreferences } from './ui/hooks/useAppPreferences';
import { ThemeProvider, useTheme } from './ui/theme/ThemeContext';
import { AIUploadProvider } from './data/contexts/AIUploadContext';
import { AlertProvider } from './ui/context/AlertContext';
import { OnboardingProvider } from './ui/hooks/useOnboarding';
import AppNavigator from './ui/navigation/AppNavigator';

import PrivacyOverlay from './ui/components/PrivacyOverlay';
import RecordingOverlay from './ui/components/RecordingOverlay';
import { profileService } from './data/services/profileService';
import { initNotifications } from './data/utils/notifications';
import './data/utils/fcmBackgroundHandler'; // Register FCM background task at module scope
import { useNotificationScheduler } from './ui/hooks/useNotificationScheduler';
import { useMedications } from './ui/hooks/useMedications';
import { useNotificationPrefs } from './ui/hooks/useNotificationPrefs';
import { useSecurity } from './ui/hooks/useSecurity';
import { useAuth } from './ui/hooks/useAuth';
import { runCacheCleanup } from './data/utils/cacheCleanup';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

/**
 * Bridge component that initializes the notification system and wires
 * useNotificationScheduler with live medications + prefs data.
 * Rendered inside AuthContext so hooks can access auth state.
 */
function NotificationBridge() {
  const { isAuthenticated } = useAuth();
  const { medications } = useMedications();
  const { prefs } = useNotificationPrefs();

  if (__DEV__) {
    console.log('[NOTIF-DEBUG][Bridge] render — meds:', medications.length,
      'prefs:', prefs ? `loaded (advance=${prefs.advance_reminder_minutes}, enabled=${prefs.dose_reminders_enabled})` : 'null');
  }

  // Initialize notification permissions + Android channels on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    if (__DEV__) console.log('[NOTIF-DEBUG][Bridge] Calling initNotifications()');
    initNotifications()
      .then((token) => {
        if (__DEV__) console.log('[NOTIF-DEBUG][Bridge] initNotifications SUCCESS, token:', token ? 'received' : 'null');
      })
      .catch((err) => {
        if (__DEV__) console.log('[NOTIF-DEBUG][Bridge] initNotifications FAILED:', err);
        logger.warn('Failed to init notifications', { error: err });
      });
  }, [isAuthenticated]);

  // Wire the scheduler — reschedules on foreground, medication events, and data changes
  useNotificationScheduler(isAuthenticated ? medications : [], isAuthenticated ? prefs : null);

  return null;
}

/**
 * Inner app shell rendered inside all context providers.
 * Handles security loading gate, lock screen, and privacy overlays.
 */
function AppShell() {
  const security = useSecurity();
  const auth = useAuth();
  const { loading: prefsLoading } = useAppPreferences();
  const { colors, isDark, loading: themeLoading } = useTheme();

  // Run cache cleanup once on mount (fire-and-forget)
  useEffect(() => {
    runCacheCleanup().catch(() => {});
  }, []);

  // While security settings, preferences, or custom theme are loading, show splash to prevent content flash
  if (security.isLoading || prefsLoading || themeLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <Image
          source={require('../assets/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <View
        style={{ flex: 1, backgroundColor: colors.bg }}
        onTouchStart={security.resetInactivityTimer}
      >
        <AIUploadProvider>
          <NotificationBridge />
          <AppNavigator />
        </AIUploadProvider>
      </View>

      {/* iOS app switcher privacy overlay */}
      {Platform.OS === 'ios' &&
        security.screenSecurityEnabled &&
        security.isAppSwitcherVisible && <PrivacyOverlay />}

      {/* iOS screen recording overlay */}
      {Platform.OS === 'ios' && security.isScreenBeingRecorded && (
        <RecordingOverlay />
      )}

    </>
  );
}

export default function App() {
  const appPreferences = useAppPreferencesProvider();
  const auth = useAuthProvider();
  const gamification = useGamificationProvider();
  const security = useSecurityProvider();

  // D15 Layer 1: Auto-detect timezone on app open and sync to backend
  useEffect(() => {
    const syncTimezone = async () => {
      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTimezone) {
          await profileService.updateMe({ timezone: detectedTimezone });
          logger.info('Timezone synced', { timezone: detectedTimezone });
        }
      } catch (error) {
        // Non-critical: timezone sync failure should not block app usage
        logger.warn('Failed to sync timezone', { error });
      }
    };

    if (auth.isAuthenticated) {
      syncTimezone();
    }
  }, [auth.isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppPreferencesContext.Provider value={appPreferences}>
          <ThemeProvider>
            <AuthContext.Provider value={auth}>
              <GamificationContext.Provider value={gamification}>
                <SecurityContext.Provider value={security}>
                  <AlertProvider>
                    <OnboardingProvider>
                      <AppShell />
                    </OnboardingProvider>
                  </AlertProvider>
                </SecurityContext.Provider>
              </GamificationContext.Provider>
            </AuthContext.Provider>
          </ThemeProvider>
        </AppPreferencesContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: 80,
    height: 80,
  },
});
