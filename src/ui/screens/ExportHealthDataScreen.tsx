import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, AlertCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useExport } from '../hooks/useExport';
import { useSecurity } from '../hooks/useSecurity';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { biometrics } from '../../data/utils/biometrics';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ScreenshotToast from '../components/ScreenshotToast';
import type { RootStackScreenProps } from '../navigation/types';
import type { DateRangePreset } from '../../domain/types';

export default function ExportHealthDataScreen({
  navigation,
}: RootStackScreenProps<'ExportHealthData'>) {
  const { loading, error, generateAndShare, clearError } = useExport();
  const security = useSecurity();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('ExportHealthData');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSelectReport = async () => {
    // Require elevated auth if biometric is enabled and grace period expired
    if (security.biometricEnabled && security.requiresElevatedAuth(2)) {
      const result = await biometrics.authenticate('Confirm to export health data');
      if (!result.success) return;
      security.recordAuthentication();
    }
    clearError();
    setShowDatePicker(true);
  };

  const handleGenerate = async (dateRange: DateRangePreset) => {
    try {
      await generateAndShare('medication_passport', dateRange);
      setShowDatePicker(false);
    } catch {
      // AccountDeactivatedError bubbles up — modal stays open for other errors
    }
  };

  const handleCloseDatePicker = () => {
    if (!loading) {
      setShowDatePicker(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Export Health Data</Text>
          <Text style={styles.headerSubtitle}>Generate downloadable reports</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle color={colors.error} size={18} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section: Available Reports */}
        <Text style={styles.sectionTitle}>AVAILABLE REPORTS</Text>

        {/* Medication Passport Card */}
        <TouchableOpacity
          style={styles.reportCard}
          activeOpacity={0.8}
          onPress={handleSelectReport}
        >
          <View style={styles.reportIcon}>
            <FileText color={colors.cyan} size={24} />
          </View>
          <View style={styles.reportContent}>
            <Text style={styles.reportTitle}>Medication Passport</Text>
            <Text style={styles.reportDescription}>
              Complete summary of your medications, dose history, emergency info,
              and adherence overview.
            </Text>
            <View style={styles.reportMeta}>
              <Text style={styles.reportFormat}>PDF</Text>
              <Text style={styles.reportSeparator}>{'\u2022'}</Text>
              <Text style={styles.reportDetail}>Share via email, AirDrop, Files</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Info Notice */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Your Reports</Text>
          <Text style={styles.infoText}>
            Reports are generated from your current medication data and dose history.
            The adherence overview is available for Visionary tier and above (2,500+ XP).
            {'\n\n'}
            Reports are limited to 10 per day and cover up to 1 year of history.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        visible={showDatePicker}
        loading={loading}
        onClose={handleCloseDatePicker}
        onGenerate={handleGenerate}
      />
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080A0F' },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },

  // Report Card
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#121721',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  reportDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportFormat: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 209, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  reportSeparator: {
    color: colors.textMuted,
    fontSize: 8,
  },
  reportDetail: {
    color: colors.textMuted,
    fontSize: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.cyan,
  },
  infoTitle: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
