/**
 * ThemedEmptyState — Renders a theme-matched Lucide icon + tagline
 * for screens with no data (Cabinet, Insights, Archived).
 *
 * Emergency Vault is explicitly excluded (D7).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PackageOpen,
  Satellite,
  Sparkles,
  Flame,
  Sprout,
  Heart,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { THEME_EMPTY_STATES } from '../theme/themeDefinitions';

// Static icon registry — Metro requires named imports, no dynamic lookup
const ICON_REGISTRY: Record<string, React.ComponentType<LucideProps>> = {
  PackageOpen,
  Satellite,
  Sparkles,
  Flame,
  Sprout,
  Heart,
};

interface ThemedEmptyStateProps {
  screen: 'cabinet' | 'alerts' | 'archived';
  fallbackMessage?: string;
}

export default function ThemedEmptyState({ screen, fallbackMessage }: ThemedEmptyStateProps) {
  const { themeId, colors } = useTheme();

  const config = THEME_EMPTY_STATES[themeId];
  const IconComponent = ICON_REGISTRY[config?.icon] ?? PackageOpen;
  const tagline = config?.tagline ?? fallbackMessage ?? 'No items yet.';

  if (__DEV__ && config?.icon && !ICON_REGISTRY[config.icon]) {
    console.warn(`[ThemedEmptyState] Icon not found in registry: ${config.icon} — falling back to PackageOpen`);
  }

  return (
    <View style={styles.container} accessibilityLabel={`Empty ${screen} screen. ${tagline}`}>
      <IconComponent color={colors.cyanDim} size={64} strokeWidth={1.5} />
      <Text style={[styles.tagline, { color: colors.textMuted }]}>{tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});
