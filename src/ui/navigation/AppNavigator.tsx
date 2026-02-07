import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
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
import AppPreferencesScreen from '../screens/AppPreferencesScreen';
import AdminScreen from '../screens/AdminScreen';
import RitualPreviewScreen from '../screens/RitualPreviewScreen';
import MedicationDetailsScreen from '../screens/MedicationDetailsScreen';
import ArchivedRitualsScreen from '../screens/ArchivedRitualsScreen';
import { ImageUploadScreen } from '../screens/ImageUploadScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
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
                animation: 'slide_from_bottom',
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
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="EditEmergencyVault" component={EditEmergencyVaultScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
            <Stack.Screen name="AppPreferences" component={AppPreferencesScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
