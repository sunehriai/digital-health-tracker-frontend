import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, DimensionValue } from 'react-native';
// @ts-ignore — @expo/vector-icons ships without type declarations in some setups
import { Ionicons } from '@expo/vector-icons';
import Input from './Input';
import { useTheme } from '../theme/ThemeContext';
import { getPasswordStrength, type PasswordStrength } from '../../domain/utils/passwordStrength';

type InputProps = React.ComponentProps<typeof Input>;

interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry'> {
  showStrength?: boolean;
  containerStyle?: InputProps['containerStyle'];
}

const STRENGTH_CONFIG: Record<PasswordStrength, { color: string; label: string; width: DimensionValue }> = {
  weak: { color: '#EF4444', label: 'Weak', width: '25%' },
  fair: { color: '#F59E0B', label: 'Fair', width: '50%' },
  good: { color: '#3B82F6', label: 'Good', width: '75%' },
  strong: { color: '#22C55E', label: 'Strong', width: '100%' },
};

export default function PasswordInput({
  showStrength = false,
  containerStyle,
  onChangeText,
  value,
  style,
  ...props
}: PasswordInputProps) {
  const { colors } = useTheme();
  const [secure, setSecure] = useState(true);
  const [internalValue, setInternalValue] = useState('');

  const password = value ?? internalValue;
  const strength = password.length > 0 ? getPasswordStrength(password) : null;
  const config = strength ? STRENGTH_CONFIG[strength] : null;

  const handleChangeText = (text: string) => {
    if (value === undefined) {
      setInternalValue(text);
    }
    onChangeText?.(text);
  };

  return (
    <View style={containerStyle}>
      <View style={styles.inputWrapper}>
        <Input
          {...props}
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={secure}
          style={[{ paddingRight: 48 }, style]}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setSecure((s) => !s)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={secure ? 'Show password' : 'Hide password'}
          accessibilityRole="button"
        >
          <Ionicons
            name={secure ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {showStrength && password.length > 0 && config && (
        <View style={styles.strengthRow}>
          <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.strengthBar,
                { width: config.width, backgroundColor: config.color },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    position: 'relative' as const,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 16,
    bottom: 0,
    height: 48, // Match the Input TextInput height exactly
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  strengthRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 6,
    gap: 8,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
