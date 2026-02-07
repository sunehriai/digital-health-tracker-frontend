import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { X, Camera, PenLine, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAIUpload } from '../../data/contexts/AIUploadContext';
import type { RootStackScreenProps } from '../navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AddMedicationScreen({ navigation }: RootStackScreenProps<'AddMedication'>) {
  const { startUpload } = useAIUpload();

  const handleAIScan = () => {
    startUpload();
    navigation.replace('ImageUpload');
  };

  return (
    <View style={styles.container}>
      {/* Backdrop - tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />

      {/* Bottom Sheet Content */}
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Add Medication</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>How would you like to add your medication?</Text>

        {/* AI Scan option */}
        <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} onPress={handleAIScan}>
          <View style={[styles.optionIcon, styles.optionIconAI]}>
            <Sparkles color={colors.cyan} size={28} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>AI Scan</Text>
            <Text style={styles.optionDesc}>Take a photo to auto-fill medication details</Text>
          </View>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>NEW</Text>
          </View>
        </TouchableOpacity>

        {/* Manual option */}
        <TouchableOpacity
          style={styles.optionCard}
          activeOpacity={0.7}
          onPress={() => navigation.replace('ManualMedicationEntry', {})}
        >
          <View style={styles.optionIcon}>
            <PenLine color={colors.cyan} size={28} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Add to Cabinet</Text>
            <Text style={styles.optionDesc}>Enter medication details by hand</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: '#0A0A0B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cyanDim,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: 13,
  },
  optionIconAI: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
  },
  aiBadge: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A0A0B',
    letterSpacing: 0.5,
  },
});
