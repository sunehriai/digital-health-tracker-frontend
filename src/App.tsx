import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, useAuthProvider } from './ui/hooks/useAuth';
import { GamificationContext, useGamificationProvider } from './ui/hooks/useGamification';
import { SecurityContext, useSecurityProvider } from './ui/hooks/useSecurity';
import { AIUploadProvider } from './data/contexts/AIUploadContext';
import AppNavigator from './ui/navigation/AppNavigator';
import LockScreen from './ui/components/LockScreen';
import PrivacyOverlay from './ui/components/PrivacyOverlay';
import RecordingOverlay from './ui/components/RecordingOverlay';
import { profileService } from './data/services/profileService';
import { initNotifications } from './data/utils/notifications';
import { useNotificationScheduler } from './ui/hooks/useNotificationScheduler';
import { useMedications } from './ui/hooks/useMedications';
import { useNotificationPrefs } from './ui/hooks/useNotificationPrefs';
import { useSecurity } from './ui/hooks/useSecurity';
import { useAuth } from './ui/hooks/useAuth';
import { colors } from './ui/theme/colors';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

/**
 * Bridge component that initializes the notification system and wires
 * useNotificationScheduler with live medications + prefs data.
 * Rendered inside AuthContext so hooks can access auth state.
 */
function NotificationBridge() {
  const { medications } = useMedications();
  const { prefs } = useNotificationPrefs();

  console.log('[NOTIF-DEBUG][Bridge] render — meds:', medications.length,
    'prefs:', prefs ? `loaded (advance=${prefs.advance_reminder_minutes}, enabled=${prefs.dose_reminders_enabled})` : 'null');

  // Initialize notification permissions + Android channels on mount
  useEffect(() => {
    console.log('[NOTIF-DEBUG][Bridge] Calling initNotifications()');
    initNotifications()
      .then((token) => {
        console.log('[NOTIF-DEBUG][Bridge] initNotifications SUCCESS, token:', token ? 'received' : 'null');
      })
      .catch((err) => {
        console.log('[NOTIF-DEBUG][Bridge] initNotifications FAILED:', err);
        logger.warn('Failed to init notifications', { error: err });
      });
  }, []);

  // Wire the scheduler — reschedules on foreground, medication events, and data changes
  useNotificationScheduler(medications, prefs);

  return null;
}

/**
 * Inner app shell rendered inside all context providers.
 * Handles security loading gate, lock screen, and privacy overlays.
 */
function AppShell() {
  const security = useSecurity();
  const auth = useAuth();

  // While security settings are loading, show splash to prevent content flash
  if (security.isLoading) {
    return (
      <View style={styles.splash}>
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
      <View
        style={{ flex: 1 }}
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

      {/* Lock screen — rendered last (on top of everything) */}
      {security.isLocked && auth.isAuthenticated && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <LockScreen />
        </View>
      )}
    </>
  );
}

export default function App() {
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
        <AuthContext.Provider value={auth}>
          <GamificationContext.Provider value={gamification}>
            <SecurityContext.Provider value={security}>
              <AppShell />
            </SecurityContext.Provider>
          </GamificationContext.Provider>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: 80,
    height: 80,
  },
});
