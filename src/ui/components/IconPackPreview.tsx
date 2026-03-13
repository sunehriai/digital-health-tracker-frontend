/**
 * IconPackPreview — A tappable card showing 3 representative icons
 * rendered with the pack's strokeWidth and fill values.
 *
 * Uses Heart instead of Shield — Shield is a compound SVG path that
 * fills as a solid blob under fill='currentColor'.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pill, Bell, Heart, Check } from 'lucide-react-native';
import { ICON_PACKS, ICON_PACK_LABELS, type IconPackId } from '../theme/themeDefinitions';
import { useTheme } from '../theme/ThemeContext';

interface IconPackPreviewProps {
  packId: IconPackId;
  isSelected: boolean;
  onPress: () => void;
}

export default function IconPackPreview({ packId, isSelected, onPress }: IconPackPreviewProps) {
  const { colors } = useTheme();
  const pack = ICON_PACKS[packId];
  const iconColor = isSelected ? colors.cyan : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.bgCard, borderColor: isSelected ? colors.cyan : colors.border },
        isSelected && styles.cardSelected,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Icon trio */}
      <View style={styles.iconRow}>
        <Pill color={iconColor} size={22} strokeWidth={pack.strokeWidth} fill={pack.fill === 'currentColor' ? iconColor : 'none'} />
        <Bell color={iconColor} size={22} strokeWidth={pack.strokeWidth} fill={pack.fill === 'currentColor' ? iconColor : 'none'} />
        <Heart color={iconColor} size={22} strokeWidth={pack.strokeWidth} fill={pack.fill === 'currentColor' ? iconColor : 'none'} />
      </View>

      {/* Label + checkmark */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: isSelected ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
          {ICON_PACK_LABELS[packId]}
        </Text>
        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: colors.cyan }]}>
            <Check color="#000" size={12} strokeWidth={3} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderWidth: 2,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
    paddingTop: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
