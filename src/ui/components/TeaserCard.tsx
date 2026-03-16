import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface TeaserCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function TeaserCard({ title, description, icon }: TeaserCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.overlay}>
        <View style={styles.iconRow}>
          {icon}
          <View style={styles.lockBadge}>
            <Lock size={10} color="#FFD700" />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  overlay: {
    alignItems: 'center',
    gap: 8,
  },
  iconRow: {
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 8,
    padding: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
