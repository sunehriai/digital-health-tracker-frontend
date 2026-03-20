import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface LowStockBadgeProps {
  count: number;
  onPress: () => void;
}

export default function LowStockBadge({ count, onPress }: LowStockBadgeProps) {
  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.tapTarget}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`${count} medication${count > 1 ? 's' : ''} low on stock. Tap to refill.`}
      accessibilityRole="button"
    >
      <View style={styles.pill}>
        <AlertTriangle size={14} color="#F59E0B" />
        <Text style={styles.count}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tapTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
