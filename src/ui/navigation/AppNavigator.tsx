import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useDeletion } from '../hooks/useDeletion';
import ReactivationBanner from '../components/ReactivationBanner';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import BiometricGateScreen from '../screens/auth/BiometricGateScreen';
import BiometricFallbackScreen from '../screens/auth/BiometricFallbackScreen';
import { biometricPrefs } from '../../data/utils/biometricPrefs';
import type { RootStackParamList } from './types';

import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import TabNavigator from './TabNavigator';
import AddMedicationScreen from '../screens/AddMedicationScreen';
import ManualMedicationEntryScreen from '../screens/ManualMedicationEntryScreen';
import EmergencyVaultScreen from '../screens/EmergencyVaultScreen';
import EditEmergencyVaultScreen from '../screens/EditEmergencyVaultScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import NotificationPrefsScreen from '../screens/NotificationPrefsScreen';
import PerMedicationNotifScreen from '../screens/PerMedicationNotifScreen';
import AppPreferencesScreen from '../screens/AppPreferencesScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import AdminScreen from '../screens/AdminScreen';
import MyJourneyScreen from '../screens/MyJourneyScreen';
import MyAdherenceScreen from '../screens/MyAdherenceScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import RitualPreviewScreen from '../screens/RitualPreviewScreen';
import MedicationDetailsScreen from '../screens/MedicationDetailsScreen';
import ArchivedRitualsScreen from '../screens/ArchivedRitualsScreen';
import ExportHealthDataScreen from '../screens/ExportHealthDataScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChangeEmailScreen from '../screens/ChangeEmailScreen';
import AgeGateScreen from '../screens/auth/AgeGateScreen';
import EmailHardGateScreen from '../screens/auth/EmailHardGateScreen';
import { ImageUploadScreen } from '../screens/ImageUploadScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { prefs: { reducedMotion } } = useAppPreferences();

  const navigationTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.cyan,
        background: colors.bg,
        card: colors.bgCard,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.error,
      },
    };
  }, [isDark, colors]);
  const { isAuthenticated, loading, deactivationInfo, signOut, clearDeactivation, refreshProfile, profileFetchComplete, user, isEmailVerified, hoursSinceCreation } = useAuth();
  const { loading: cancelLoading, cancelDeletion } = useDeletion();

  // Biometric gate state (Fix 6 — null initial values for async-loaded state)
  const [biometricEnabled, setBiometricEnabled] = useState<boolean | null>(null);
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [ageGateCompleted, setAgeGateCompleted] = useState<boolean | null>(null);
  const [emailVerifiedConfirmed, setEmailVerifiedConfirmed] = useState(false);

  // Load biometric prefs + age gate cache on mount
  useEffect(() => {
    (async () => {
      const [enabled, ageDone, email, provider] = await Promise.all([
        biometricPrefs.isEnabled(),
        AsyncStorage.getItem('@vitaquest:age_gate_completed'),
        biometricPrefs.getLastEmail(),
        biometricPrefs.getLastProvider(),
      ]);
      setBiometricEnabled(enabled);
      setAgeGateCompleted(ageDone === 'true');
      setLastEmail(email);
      setLastProvider(provider);
    })();
  }, []);

  // Re-read biometric enabled when app returns to foreground (Fix 9)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const enabled = await biometricPrefs.isEnabled();
        setBiometricEnabled(enabled);
      }
    });
    return () => sub.remove();
  }, []);

  // Reset biometric state when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      setBiometricPassed(false);
      setShowFallback(false);
      setEmailVerifiedConfirmed(false);
    }
  }, [isAuthenticated]);

  const handleCancelDeletion = useCallback(async () => {
    const success = await cancelDeletion();
    if (success) {
      clearDeactivation();
      // Sync user state so is_deactivated reflects server truth
      await refreshProfile();
    }
  }, [cancelDeletion, clearDeactivation, refreshProfile]);

  const handleSignOut = useCallback(async () => {
    // Sign out without cancelling — timer keeps running
    await signOut();
  }, [signOut]);

  if (loading || biometricEnabled === null || ageGateCompleted === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </View>
    );
  }

  // Step 19: Show ReactivationBanner when user is deactivated
  if (isAuthenticated && deactivationInfo?.pending) {
    return (
      <ReactivationBanner
        deletionType={deactivationInfo.deletionType}
        permanentDeletionDate={deactivationInfo.permanentDeletionDate}
        daysRemaining={deactivationInfo.daysRemaining}
        loading={cancelLoading}
        onCancelDeletion={handleCancelDeletion}
        onSignOut={handleSignOut}
      />
    );
  }

  // Age Gate: require date_of_birth before accessing main app (Q7: skip if cached)
  if (isAuthenticated && profileFetchComplete && user?.date_of_birth === null && !ageGateCompleted) {
    return <AgeGateScreen />;
  }

  // Email hard gate: block access after 24hr unverified
  if (isAuthenticated && !isEmailVerified && !emailVerifiedConfirmed &&
      user?.auth_provider === 'email' && hoursSinceCreation >= 24) {
    return (
      <EmailHardGateScreen
        onVerified={() => setEmailVerifiedConfirmed(true)}
        onSignOut={async () => {
          await signOut();
          setEmailVerifiedConfirmed(false);
        }}
      />
    );
  }

  // Biometric gate: show before main content if enabled and not yet passed
  if (isAuthenticated && biometricEnabled && !biometricPassed) {
    if (showFallback) {
      return (
        <BiometricFallbackScreen
          lastEmail={lastEmail}
          lastProvider={lastProvider}
          onSuccess={() => {
            setBiometricPassed(true);
            setShowFallback(false);
          }}
          onUseFullLogin={async () => {
            await signOut();
            setShowFallback(false);
            setBiometricPassed(false);
          }}
        />
      );
    }
    return (
      <BiometricGateScreen
        onSuccess={() => setBiometricPassed(true)}
        onFallback={() => setShowFallback(true)}
        onSkip={() => setBiometricPassed(true)}
      />
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: reducedMotion ? 'none' : 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="AddMedication"
              component={AddMedicationScreen}
              options={{
                presentation: 'transparentModal',
                animation: reducedMotion ? 'none' : 'slide_from_bottom',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen name="ImageUpload" component={ImageUploadScreen} />
            <Stack.Screen name="ManualMedicationEntry" component={ManualMedicationEntryScreen} />
            <Stack.Screen name="RitualPreview" component={RitualPreviewScreen} />
            <Stack.Screen name="MedicationDetails" component={MedicationDetailsScreen} />
            <Stack.Screen name="ArchivedRituals" component={ArchivedRitualsScreen} />
            <Stack.Screen
              name="EmergencyVault"
              component={EmergencyVaultScreen}
              options={{ presentation: 'modal', animation: reducedMotion ? 'none' : 'slide_from_bottom' }}
            />
            <Stack.Screen name="EditEmergencyVault" component={EditEmergencyVaultScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
            <Stack.Screen name="PerMedicationNotif" component={PerMedicationNotifScreen} />
            <Stack.Screen name="AppPreferences" component={AppPreferencesScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="MyJourney" component={MyJourneyScreen} />
            <Stack.Screen name="MyAdherence" component={MyAdherenceScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
            <Stack.Screen name="ExportHealthData" component={ExportHealthDataScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
