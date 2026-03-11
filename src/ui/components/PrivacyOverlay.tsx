// Force-dark: This screen always uses dark theme regardless of user preference
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { darkColors } from '../theme/ThemeContext';

/**
 * Full-screen overlay shown on iOS app switcher to hide sensitive content.
 * Renders instantly with no animations (must appear before iOS captures snapshot).
 */
export default function PrivacyOverlay() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/splash-icon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: darkColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  icon: {
    width: 80,
    height: 80,
  },
});
