import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Pause } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';
import type { Medication } from '../../domain/types';

interface RitualItem {
  medication: Medication;
  status: 'taken' | 'pending' | 'missed' | 'paused';
}

interface TodaysRitualsProps {
  rituals: RitualItem[];
  onTakeDose?: (medicationId: string) => void;
}

function getStatusConfig(colors: ColorPalette) {
  return {
    taken: { icon: CheckCircle2, color: colors.success, label: 'Taken' },
    pending: { icon: Circle, color: colors.cyan, label: 'Pending' },
    missed: { icon: Circle, color: colors.error, label: 'Missed' },
    paused: { icon: Pause, color: colors.textMuted, label: 'Paused' },
  } as const;
}

export default function TodaysRituals({ rituals, onTakeDose }: TodaysRitualsProps) {
  const { colors } = useTheme();
  const { prefs: { timeFormat } } = useAppPreferences();

  const STATUS_CONFIG = getStatusConfig(colors);

  const renderItem = ({ item }: { item: RitualItem }) => {
    const config = STATUS_CONFIG[item.status];
    const Icon = config.icon;

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={item.status === 'pending' ? 0.6 : 1}
        onPress={item.status === 'pending' ? () => onTakeDose?.(item.medication.id) : undefined}
      >
        <Icon color={config.color} size={20} />
        <View style={styles.rowInfo}>
          <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>{item.medication.name}</Text>
          <Text style={[styles.medTime, { color: colors.textMuted }]}>{formatTime(item.medication.time_of_day, timeFormat)}</Text>
        </View>
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.header, { color: colors.textMuted }]}>TODAY'S RITUALS</Text>
      <FlatList
        data={rituals}
        keyExtractor={(item) => item.medication.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />
      {rituals.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No rituals scheduled today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600' },
  medTime: { fontSize: 12, marginTop: 2 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
