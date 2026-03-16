import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface UnlockDividerProps {
  xpNeeded?: number;
}

export default function UnlockDivider({ xpNeeded }: UnlockDividerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <View style={[styles.badge, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Lock size={12} color={colors.textMuted} />
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {xpNeeded ? `${xpNeeded.toLocaleString()} XP to unlock` : 'Tier 4 required'}
        </Text>
      </View>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  line: {
    flex: 1,
    height: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
