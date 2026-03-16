/**
 * Medication icon dispatcher.
 * Renders a CapsuleIcon for solid forms, or a Droplets icon for liquid forms.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Droplets } from 'lucide-react-native';
import CapsuleIcon from './CapsuleIcon';
import type { ColorPalette } from '../theme/ThemeContext';

interface MedicationIconProps {
  medication: {
    name: string;
    dose_unit?: string;
    is_paused?: boolean;
  };
  size?: number;
  colors: ColorPalette;
}

const LIQUID_UNITS = new Set(['mL', 'ml', 'tsp', 'tbsp', 'drops', 'oz']);

function isLiquidUnit(unit?: string): boolean {
  if (!unit) return false;
  return LIQUID_UNITS.has(unit);
}

function MedicationIconInner({ medication, size = 24, colors }: MedicationIconProps) {
  if (isLiquidUnit(medication.dose_unit)) {
    const iconColor = medication.is_paused ? colors.textMuted : '#22D3EE'; // Cyan tint for liquid
    return (
      <View style={[styles.liquidGlow, !medication.is_paused && { shadowColor: '#22D3EE', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }]}>
        <Droplets color={iconColor} size={size} strokeWidth={2.5} />
      </View>
    );
  }

  return (
    <CapsuleIcon
      name={medication.name}
      size={size}
      paused={medication.is_paused}
      mutedColor={colors.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  liquidGlow: {
    shadowOffset: { width: 0, height: 0 },
  },
});

export default React.memo(MedicationIconInner);
