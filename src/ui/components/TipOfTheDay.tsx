import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export default function TipOfTheDay() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Lightbulb color={colors.cyan} size={16} strokeWidth={2} />
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.heading, { color: colors.cyan }]}>TIP OF THE DAY</Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            Take your medications with a full glass of water to improve absorption and reduce stomach irritation.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(18, 23, 33, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 216, 255, 0.15)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 216, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 216, 255, 0.25)',
  },
  textContent: { flex: 1 },
  heading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    opacity: 0.9,
  },
});
