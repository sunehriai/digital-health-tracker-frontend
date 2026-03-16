import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const DELAYED_COLOR = '#F59E0B';
const MISSED_BORDER = '#F87171';

export default function CalendarLegend() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: colors.cyan }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Perfect (all meds)</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: DELAYED_COLOR }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Delayed</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyan, overflow: 'hidden' },
            ]}
          >
            {/* Half-circle indicator */}
            <View style={[styles.halfCircle, { backgroundColor: colors.textPrimary }]} />
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Partial (some meds)</Text>
        </View>
        <View style={styles.item}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: 'transparent', borderWidth: 1, borderColor: MISSED_BORDER },
            ]}
          />
          <Text style={[styles.label, { color: colors.textMuted }]}>Missed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  halfCircle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: 12,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
