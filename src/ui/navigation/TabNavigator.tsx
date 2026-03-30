import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Home, Pill, TrendingUp, Settings } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { measureElement } from '../utils/measureElement';
import WelcomeScreen from '../components/onboarding/WelcomeScreen';
import NavigationTour from '../components/onboarding/NavigationTour';
import TrialBanner from '../components/TrialBanner';
import type { TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import CabinetScreen from '../screens/CabinetScreen';
import InsightTrendsScreen from '../screens/InsightTrendsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { colors, iconStyle, iconPackId } = useTheme();
  const { isWelcomeVisible, isTourActive, setTargetRect } = useOnboarding();

  // Custom tab bar wrapper that measures itself for the onboarding tour spotlight
  const renderTabBar = useCallback((props: BottomTabBarProps) => (
    <View
      onLayout={(e) => {
        measureElement(e.target, (x, y, w, h) => {
          if (w > 0 && h > 0) {
            setTargetRect(0, { x, y, width: w, height: h }); // Step 0: full tab bar
          }
        });
      }}
    >
      <BottomTabBar {...props} />
    </View>
  ), [setTargetRect]);
  // D12: Do NOT use fill='currentColor' in TabNavigator — resolves to black on Android SVG.
  // Instead, use React Navigation's `color` prop as fill for the filled pack.
  const getIconFill = (color: string) => iconPackId === 'filled' ? color : 'none';

  const wrapWithGlow = (icon: React.ReactNode, focused: boolean) => (
    <View style={focused ? [tabGlowStyles.glow, { shadowColor: colors.cyan }] : undefined}>
      {icon}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <TrialBanner />
      <Tab.Navigator
        tabBar={renderTabBar}
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
          listeners={{
            tabPress: () => {
              // Measure Cabinet tab for fallback of step 1 (if FAB not measured)
            },
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

      {/* Onboarding overlays — rendered INSIDE NavigationContainer tree (BP-001/002 fix) */}
      {isWelcomeVisible && <WelcomeScreen />}
      {isTourActive && <NavigationTour />}
    </View>
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
