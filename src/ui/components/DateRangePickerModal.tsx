import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { DateRangePreset } from '../../domain/types';

interface Props {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onGenerate: (range: DateRangePreset) => void;
}

const PRESETS: { label: string; value: DateRangePreset; description: string }[] = [
  { label: 'Last 7 days', value: '7d', description: 'Past week' },
  { label: 'Last 30 days', value: '30d', description: 'Past month' },
  { label: 'Last 90 days', value: '90d', description: 'Past 3 months' },
  { label: 'Last 6 months', value: '6mo', description: 'Half year' },
  { label: 'All time', value: 'all', description: 'Up to 1 year' },
];

export default function DateRangePickerModal({ visible, loading, onClose, onGenerate }: Props) {
  const [selected, setSelected] = useState<DateRangePreset>('30d');

  const handleGenerate = () => {
    onGenerate(selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={loading ? undefined : onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Date Range</Text>
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeBtn}>
              <X color={colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose the time period for your health report
          </Text>

          {/* Preset Buttons */}
          <View style={styles.presets}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.presetBtn,
                  selected === preset.value && styles.presetBtnActive,
                ]}
                onPress={() => setSelected(preset.value)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetLabel,
                    selected === preset.value && styles.presetLabelActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.presetDesc,
                    selected === preset.value && styles.presetDescActive,
                  ]}
                >
                  {preset.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.generateBtnText}>Generating PDF...</Text>
              </View>
            ) : (
              <Text style={styles.generateBtnText}>Generate Report</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121721',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  presets: {
    gap: 8,
    marginBottom: 24,
  },
  presetBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A0E14',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  presetBtnActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
  },
  presetLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  presetLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  presetDesc: {
    color: colors.textMuted,
    fontSize: 12,
  },
  presetDescActive: {
    color: colors.cyan,
  },
  generateBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
