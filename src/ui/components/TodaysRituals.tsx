import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Pause } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { Medication } from '../../domain/types';

interface RitualItem {
  medication: Medication;
  status: 'taken' | 'pending' | 'missed' | 'paused';
}

interface TodaysRitualsProps {
  rituals: RitualItem[];
  onTakeDose?: (medicationId: string) => void;
}

const STATUS_CONFIG = {
  taken: { icon: CheckCircle2, color: colors.success, label: 'Taken' },
  pending: { icon: Circle, color: colors.cyan, label: 'Pending' },
  missed: { icon: Circle, color: colors.error, label: 'Missed' },
  paused: { icon: Pause, color: colors.textMuted, label: 'Paused' },
} as const;

export default function TodaysRituals({ rituals, onTakeDose }: TodaysRitualsProps) {
  const renderItem = ({ item }: { item: RitualItem }) => {
    const config = STATUS_CONFIG[item.status];
    const Icon = config.icon;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={item.status === 'pending' ? 0.6 : 1}
        onPress={item.status === 'pending' ? () => onTakeDose?.(item.medication.id) : undefined}
      >
        <Icon color={config.color} size={20} />
        <View style={styles.rowInfo}>
          <Text style={styles.medName} numberOfLines={1}>{item.medication.name}</Text>
          <Text style={styles.medTime}>{item.medication.time_of_day}</Text>
        </View>
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TODAY'S RITUALS</Text>
      <FlatList
        data={rituals}
        keyExtractor={(item) => item.medication.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />
      {rituals.length === 0 && (
        <Text style={styles.empty}>No rituals scheduled today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    color: colors.textMuted,
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
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  medName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  medTime: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
