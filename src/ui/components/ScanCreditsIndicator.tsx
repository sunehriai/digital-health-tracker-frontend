/**
 * ScanCreditsIndicator — shows remaining AI scan credits.
 * Displays "AI Scans: X of 2 remaining" with a small progress bar.
 * Hidden when subscription flag is off or user is premium.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  credits: number;
  total?: number;
}

export default function ScanCreditsIndicator({ credits, total = 2 }: Props) {
  const { colors } = useTheme();
  const fraction = Math.min(credits / total, 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Sparkles color={colors.cyan} size={16} />
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          AI Scans: {credits} of {total} remaining
        </Text>
        <View style={[styles.barTrack, { backgroundColor: colors.bgSubtle }]}>
          <View style={[styles.barFill, { width: `${fraction * 100}%`, backgroundColor: credits > 0 ? colors.cyan : colors.error }]} />
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Lifetime {credits > 0 ? '' : '· '}
          {credits === 0 ? 'Upgrade for unlimited' : 'Upgrade for \u221E'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  textCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
  barFill: { height: 4, borderRadius: 2 },
  sub: { fontSize: 11 },
});
