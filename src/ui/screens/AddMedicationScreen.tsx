import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { X, Camera, PenLine, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useSubscription } from '../hooks/useSubscription';
import { authService } from '../../data/services/authService';
import { useAIUpload } from '../../data/contexts/AIUploadContext';
import ScanCreditsIndicator from '../components/ScanCreditsIndicator';
import OutOfScansModal from '../components/OutOfScansModal';
import type { RootStackScreenProps } from '../navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AddMedicationScreen({ navigation }: RootStackScreenProps<'AddMedication'>) {
  const { colors, isDark } = useTheme();
  const { isEmailVerified } = useAuth();
  const { showAlert } = useAlert();
  const { startUpload } = useAIUpload();
  const { subscriptionEnabled, isPremium, aiScanCredits } = useSubscription();
  const [showOutOfScans, setShowOutOfScans] = useState(false);

  const showCreditIndicator = subscriptionEnabled && !isPremium;

  const handleAIScan = () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Verify',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    // Credit check: free users with 0 credits see OutOfScansModal
    if (subscriptionEnabled && !isPremium && aiScanCredits <= 0) {
      setShowOutOfScans(true);
      return;
    }
    startUpload();
    navigation.replace('ImageUpload');
  };

  return (
    <View style={styles.container}>
      {/* Backdrop - tap to dismiss */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => navigation.goBack()} />

      {/* Bottom Sheet Content */}
      <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Add Medication</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color={colors.textSecondary} size={24} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>How would you like to add your medication?</Text>

        {/* AI scan credit indicator for non-premium users */}
        {showCreditIndicator && (
          <ScanCreditsIndicator credits={aiScanCredits} />
        )}

        {/* Out of scans modal */}
        <OutOfScansModal
          visible={showOutOfScans}
          onUpgrade={() => {
            setShowOutOfScans(false);
            navigation.goBack();
            setTimeout(() => navigation.navigate('Paywall' as any), 100);
          }}
          onAddManually={() => {
            setShowOutOfScans(false);
            navigation.replace('ManualMedicationEntry', {});
          }}
          onDismiss={() => setShowOutOfScans(false)}
        />

        {/* AI Scan option */}
        <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.7} onPress={handleAIScan}>
          <View style={[styles.optionIcon, styles.optionIconAI]}>
            <Sparkles color={colors.cyan} size={28} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>AI Scan</Text>
            <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Take a photo to auto-fill medication details</Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: colors.cyan }]}>
            <Text style={[styles.aiBadgeText, { color: colors.bg }]}>NEW</Text>
          </View>
        </TouchableOpacity>

        {/* Manual option */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => navigation.replace('ManualMedicationEntry', {})}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.cyanDim }]}>
            <PenLine color={colors.cyan} size={28} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Add to Cabinet</Text>
            <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Enter medication details by hand</Text>
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
    backgroundColor: 'transparent',
  },
  sheet: {
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    fontSize: 24,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
  },
  optionIconAI: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
