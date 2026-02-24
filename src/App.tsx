import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext, useAuthProvider } from './ui/hooks/useAuth';
import { GamificationContext, useGamificationProvider } from './ui/hooks/useGamification';
import { AIUploadProvider } from './data/contexts/AIUploadContext';
import AppNavigator from './ui/navigation/AppNavigator';
import { profileService } from './data/services/profileService';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

export default function App() {
  const auth = useAuthProvider();
  const gamification = useGamificationProvider();

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
            <AIUploadProvider>
              <AppNavigator />
            </AIUploadProvider>
          </GamificationContext.Provider>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
