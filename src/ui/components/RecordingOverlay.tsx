// Force-dark: This screen always uses dark theme regardless of user preference
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { darkColors } from '../theme/ThemeContext';

/**
 * Full-screen overlay shown when iOS screen recording is detected.
 * Hides sensitive content and displays an informational message.
 */
export default function RecordingOverlay() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/splash-icon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.message}>
        Screen recording detected. Vision has hidden sensitive content to protect
        your health data.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: darkColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 9997,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  message: {
    color: darkColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
