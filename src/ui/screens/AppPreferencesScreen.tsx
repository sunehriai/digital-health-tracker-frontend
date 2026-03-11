import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Switch from '../primitives/Switch';
import TimeInput from '../components/TimeInput';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import type { RootStackScreenProps } from '../navigation/types';

// ── Segmented Control ───────────────────────────────────────────────────

interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ options, selected, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={segStyles.row}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              segStyles.option,
              { backgroundColor: active ? 'rgba(0, 209, 255, 0.15)' : colors.bgElevated,
                borderColor: active ? colors.cyan : colors.border,
                borderWidth: 1 },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[segStyles.optionText, { color: active ? colors.cyan : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// ── Preference Row (switch with optional description) ────────────────────

interface PrefRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

function PrefRow({ label, description, value, onValueChange }: PrefRowProps) {
  const { colors } = useTheme();
  return (
    <View style={rowStyles.container}>
      <Switch label={label} value={value} onValueChange={onValueChange} />
      {description ? (
        <Text style={[rowStyles.description, { color: colors.textMuted }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
  },
});

// ── Main Screen ──────────────────────────────────────────────────────────

const TIME_FORMAT_OPTIONS: SegmentOption<'12h' | '24h'>[] = [
  { label: '12h', value: '12h' },
  { label: '24h', value: '24h' },
];

// Light/System themes not fully supported yet — locked to Dark
// const THEME_OPTIONS: SegmentOption<'dark' | 'light' | 'system'>[] = [
//   { label: 'Dark', value: 'dark' },
//   { label: 'Light', value: 'light' },
//   { label: 'System', value: 'system' },
// ];

export default function AppPreferencesScreen({ navigation }: RootStackScreenProps<'AppPreferences'>) {
  const { colors } = useTheme();
  const { prefs, updatePref } = useAppPreferences();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>App Preferences</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── ACCESSIBILITY Section ────────────────────────────────────── */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCESSIBILITY</Text>

          <View style={[styles.card, { backgroundColor: colors.bgElevated }]}>
            <PrefRow
              label="Haptic Feedback"
              value={prefs.hapticFeedback}
              onValueChange={(val) => updatePref('hapticFeedback', val)}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <PrefRow
              label="Reduced Motion"
              description="Reduces animations across the app"
              value={prefs.reducedMotion}
              onValueChange={(val) => updatePref('reducedMotion', val)}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <PrefRow
              label="Sound"
              description="Play sounds for notifications"
              value={prefs.soundEnabled}
              onValueChange={(val) => updatePref('soundEnabled', val)}
            />
          </View>
        </View>

        {/* ── DISPLAY Section ──────────────────────────────────────────── */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DISPLAY</Text>

          <View style={[styles.card, { backgroundColor: colors.bgElevated }]}>
            {/* Time Format */}
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textPrimary }]}>Time Format</Text>
              <SegmentedControl
                options={TIME_FORMAT_OPTIONS}
                selected={prefs.timeFormat}
                onChange={(val) => updatePref('timeFormat', val)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Default Dose Time */}
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textPrimary }]}>Default Dose Time</Text>
              <View style={styles.timeInputWrapper}>
                <TimeInput
                  value={prefs.defaultDoseTime}
                  onChange={(val) => updatePref('defaultDoseTime', val)}
                />
              </View>
            </View>

            {/* Theme selector hidden — light/system themes not fully supported yet */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  controlGroup: {
    paddingVertical: 12,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  timeInputWrapper: {
    marginTop: 4,
  },
});
