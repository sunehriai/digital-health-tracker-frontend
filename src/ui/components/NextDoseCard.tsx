import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { Medication } from '../../domain/types';

interface NextDoseCardProps {
  medication: Medication;
  timeUntil: string;
  onPress?: () => void;
}

export default function NextDoseCard({ medication, timeUntil, onPress }: NextDoseCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Clock color={colors.cyan} size={18} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{medication.name}</Text>
        <Text style={styles.detail}>
          {medication.dose_size} dose · {medication.meal_relation !== 'none' ? medication.meal_relation + ' meal' : medication.time_of_day}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <Text style={styles.timeValue}>{timeUntil}</Text>
        <ChevronRight color={colors.textMuted} size={16} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cyanDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeValue: { color: colors.cyan, fontSize: 14, fontWeight: '700' },
});
