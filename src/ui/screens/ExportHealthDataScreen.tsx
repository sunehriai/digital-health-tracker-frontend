import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/AlertContext';
import { useExport } from '../hooks/useExport';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { authService } from '../../data/services/authService';
import PasswordInput from '../primitives/PasswordInput';
import DateRangePickerModal from '../components/DateRangePickerModal';
import ScreenshotToast from '../components/ScreenshotToast';
import type { RootStackScreenProps } from '../navigation/types';
import type { DateRangePreset } from '../../domain/types';

export default function ExportHealthDataScreen({
  navigation,
}: RootStackScreenProps<'ExportHealthData'>) {
  const { colors } = useTheme();
  const { user, isEmailVerified } = useAuth();
  const { showAlert } = useAlert();
  const { loading, error, generateAndShare, clearError } = useExport();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('ExportHealthData');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Tier 3 password re-auth state
  const [tier3Visible, setTier3Visible] = useState(false);
  const [tier3Password, setTier3Password] = useState('');
  const [tier3Error, setTier3Error] = useState('');
  const [tier3Loading, setTier3Loading] = useState(false);

  // BP-012: Explicit match
  const isSocialUser = user?.auth_provider === 'google' || user?.auth_provider === 'apple';

  const handleSelectReport = async () => {
    if (!isEmailVerified) {
      showAlert({
        title: 'Verify Your Email',
        message: 'Please verify your email before performing this action.',
        confirmLabel: 'Send Verification Link',
        cancelLabel: 'Later',
        onConfirm: async () => {
          try { await authService.sendVerificationEmail(); } catch {}
        },
      });
      return;
    }
    if (isSocialUser) {
      // Social users: re-auth via provider
      try {
        if (user?.auth_provider === 'google') {
          await authService.reauthenticateWithGoogle();
        } else {
          await authService.reauthenticateWithApple();
        }
        // Re-auth succeeded, proceed with export
        clearError();
        setShowDatePicker(true);
      } catch (e: any) {
        if (e.message === 'Cancelled') return;
        showAlert({ title: 'Error', message: e.message || 'Re-authentication failed', type: 'error' });
      }
    } else {
      // Email users: show password modal
      setTier3Password('');
      setTier3Error('');
      setTier3Visible(true);
    }
  };

  const handleTier3Submit = async () => {
    if (!tier3Password) return;
    setTier3Loading(true);
    setTier3Error('');
    try {
      await authService.reauthenticate(user?.email || '', tier3Password);
      // Re-auth succeeded, proceed with export
      setTier3Visible(false);
      clearError();
      setShowDatePicker(true);
    } catch (e: any) {
      setTier3Error('Incorrect password');
    } finally {
      setTier3Loading(false);
    }
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Export Health Data</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Generate downloadable reports</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle color={colors.error} size={18} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={[styles.errorDismiss, { color: colors.textMuted }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section: Available Reports */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>AVAILABLE REPORTS</Text>

        {/* Medication Passport Card */}
        <TouchableOpacity
          style={[styles.reportCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={handleSelectReport}
        >
          <View style={[styles.reportIcon, { backgroundColor: colors.cyanDim }]}>
            <FileText color={colors.cyan} size={24} />
          </View>
          <View style={styles.reportContent}>
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>Medication Passport</Text>
            <Text style={[styles.reportDescription, { color: colors.textSecondary }]}>
              Complete summary of your medications, dose history, emergency info,
              and adherence overview.
            </Text>
            <View style={styles.reportMeta}>
              <Text style={[styles.reportFormat, { color: colors.cyan }]}>PDF</Text>
              <Text style={[styles.reportSeparator, { color: colors.textMuted }]}>{'\u2022'}</Text>
              <Text style={[styles.reportDetail, { color: colors.textMuted }]}>Share via email, AirDrop, Files</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Info Notice */}
        <View style={[styles.infoCard, { borderLeftColor: colors.cyan }]}>
          <Text style={[styles.infoTitle, { color: colors.cyan }]}>About Your Reports</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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

      {/* Tier 3 Password Re-auth Modal */}
      <Modal visible={tier3Visible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>Confirm Your Identity</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>Enter your password to export health data</Text>
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={tier3Password}
              onChangeText={(text) => { setTier3Password(text); if (tier3Error) setTier3Error(''); }}
            />
            {tier3Error ? <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{tier3Error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setTier3Visible(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTier3Submit}
                disabled={!tier3Password || tier3Loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.cyan, alignItems: 'center', opacity: !tier3Password || tier3Loading ? 0.5 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{tier3Loading ? 'Verifying...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
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
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },

  // Report Card
  reportCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  reportDescription: {
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
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 209, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  reportSeparator: {
    fontSize: 8,
  },
  reportDetail: {
    fontSize: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
