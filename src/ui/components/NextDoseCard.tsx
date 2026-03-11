import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';
import type { Medication } from '../../domain/types';

interface NextDoseCardProps {
  medication: Medication;
  timeUntil: string;
  onPress?: () => void;
}

export default function NextDoseCard({ medication, timeUntil, onPress }: NextDoseCardProps) {
  const { colors } = useTheme();
  const { prefs: { timeFormat } } = useAppPreferences();

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: colors.cyanDim }]}>
        <Clock color={colors.cyan} size={18} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{medication.name}</Text>
        <Text style={[styles.detail, { color: colors.textMuted }]}>
          {medication.dose_size} dose · {medication.meal_relation !== 'none' ? medication.meal_relation + ' meal' : formatTime(medication.time_of_day, timeFormat)}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeValue, { color: colors.cyan }]}>{timeUntil}</Text>
        <ChevronRight color={colors.textMuted} size={16} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 12, marginTop: 2 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeValue: { fontSize: 14, fontWeight: '700' },
});
