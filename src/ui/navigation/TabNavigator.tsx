import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Pill, TrendingUp, Settings } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import CabinetScreen from '../screens/CabinetScreen';
import InsightTrendsScreen from '../screens/InsightTrendsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { colors, iconStyle, iconPackId } = useTheme();
  // D12: Do NOT use fill='currentColor' in TabNavigator — resolves to black on Android SVG.
  // Instead, use React Navigation's `color` prop as fill for the filled pack.
  const getIconFill = (color: string) => iconPackId === 'filled' ? color : 'none';

  const wrapWithGlow = (icon: React.ReactNode, focused: boolean) => (
    <View style={focused ? [tabGlowStyles.glow, { shadowColor: colors.cyan }] : undefined}>
      {icon}
    </View>
  );

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
        tabBarItemStyle: {
          minHeight: 48,
        },
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
          tabBarIcon: ({ color, size, focused }) => wrapWithGlow(<Home color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />, focused),
        }}
      />
      <Tab.Screen
        name="Cabinet"
        component={CabinetScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => wrapWithGlow(<Pill color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />, focused),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightTrendsScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => wrapWithGlow(<TrendingUp color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />, focused),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => wrapWithGlow(<Settings color={color} size={size} fill={getIconFill(color)} strokeWidth={iconStyle.strokeWidth} />, focused),
        }}
      />
    </Tab.Navigator>
  );
}

const tabGlowStyles = StyleSheet.create({
  glow: {
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
