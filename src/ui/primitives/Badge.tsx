import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'cyan' | 'success' | 'warning' | 'error' | 'muted';
  style?: ViewStyle;
}

export default function Badge({ label, variant = 'cyan', style }: BadgeProps) {
  const { colors } = useTheme();

  const variantColors = {
    cyan: { bg: colors.cyanDim, text: colors.cyan },
    success: { bg: 'rgba(34, 197, 94, 0.15)', text: colors.success },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning },
    error: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
    muted: { bg: colors.bgElevated, text: colors.textMuted },
  };

  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
