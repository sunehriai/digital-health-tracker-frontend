import React from 'react';
import { Switch as RNSwitch, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface SwitchProps {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  style?: ViewStyle;
}

export default function Switch({ label, value, onValueChange, style }: SwitchProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.bgElevated, true: colors.cyanDim }}
        thumbColor={value ? colors.cyan : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
