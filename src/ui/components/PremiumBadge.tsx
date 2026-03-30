/**
 * PremiumBadge — small lock icon indicating a premium-only feature.
 * Parent handles tap navigation.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function PremiumBadge({ size = 14, color = '#8E9196' }: Props) {
  return (
    <View style={styles.badge}>
      <Lock color={color} size={size} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: 6,
  },
});
