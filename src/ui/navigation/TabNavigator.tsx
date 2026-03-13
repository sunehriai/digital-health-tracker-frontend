import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Pill, Bell, Settings } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import CabinetScreen from '../screens/CabinetScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { colors, iconStyle, iconPackId } = useTheme();
  // D12: Do NOT use fill='currentColor' in TabNavigator — resolves to black on Android SVG.
  // Instead, use React Navigation's `color` prop as fill for the filled pack.
  const getIconFill = (color: string) => iconPackId === 'filled' ? color : 'none';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgDark,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />,
        }}
      />
      <Tab.Screen
        name="Cabinet"
        component={CabinetScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Pill color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />,
        }}
      />
    </Tab.Navigator>
  );
}
