import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–100
  label?: string;
  color?: string;
}

export default function CircularProgress({
  size = 80,
  strokeWidth = 6,
  progress,
  label,
  color,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.cyan;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(progress, 100)) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.value, { color: resolvedColor }]}>{Math.round(progress)}%</Text>
        {label && <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  labelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 9, fontWeight: '600', marginTop: 1 },
});
