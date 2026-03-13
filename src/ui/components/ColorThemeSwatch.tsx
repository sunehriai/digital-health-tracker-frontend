/**
 * ColorThemeSwatch — A tappable card showing a color preview for a theme.
 * Displays 3 horizontal color bands (accent, bg, card), theme name, and
 * a checkmark circle when selected.
 *
 * Uses hardcoded colors from THEME_PALETTES for its own background rendering —
 * not the current theme — so visual contrast doesn't collapse when the active
 * theme changes.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { THEME_PALETTES, THEME_LABELS, type ThemeId } from '../theme/themeDefinitions';

interface ColorThemeSwatchProps {
  themeId: ThemeId;
  isSelected: boolean;
  onPress: () => void;
}

export default function ColorThemeSwatch({ themeId, isSelected, onPress }: ColorThemeSwatchProps) {
  const palette = THEME_PALETTES[themeId];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: palette.bgCard, borderColor: isSelected ? palette.cyan : palette.border },
        isSelected && styles.cardSelected,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Color bands preview */}
      <View style={styles.bandsRow}>
        <View style={[styles.band, { backgroundColor: palette.cyan }]} />
        <View style={[styles.band, { backgroundColor: palette.bg }]} />
        <View style={[styles.band, { backgroundColor: palette.bgElevated }]} />
      </View>

      {/* Label + checkmark row */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.textPrimary }]} numberOfLines={1}>
          {THEME_LABELS[themeId]}
        </Text>
        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: palette.cyan }]}>
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
    minHeight: 100,
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderWidth: 2,
  },
  bandsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  band: {
    flex: 1,
    height: 28,
    borderRadius: 6,
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
