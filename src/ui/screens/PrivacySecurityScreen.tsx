import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Clock,
  Download,
  FileText,
  Shield,
  Eye,
  Lock,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { biometrics } from '../../data/utils/biometrics';
import { useSecurity } from '../hooks/useSecurity';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';
import type { RootStackScreenProps } from '../navigation/types';

const AUTO_LOCK_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: 'Never', value: -1 },
];

const PRIVACY_POLICY_URL = 'https://vitalic.app/privacy';

export default function PrivacySecurityScreen({ navigation }: RootStackScreenProps<'PrivacySecurity'>) {
  const { colors } = useTheme();
  const security = useSecurity();
  const { showAlert } = useAlert();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('PrivacySecurity');
  const [showAutoLockPicker, setShowAutoLockPicker] = useState(false);

  const handleBiometricChange = async (value: boolean) => {
    if (value) {
      // Check hardware availability and enrollment before enabling
      const available = await biometrics.isAvailable();
      if (!available) {
        showAlert({
          title: 'Biometrics Unavailable',
          message: 'Your device does not have biometric authentication set up. Please enable Face ID, Touch ID, or fingerprint in your device Settings.',
          type: 'warning',
        });
        return;
      }

      // Require a biometric challenge to confirm identity before enabling
      const result = await biometrics.authenticate('Confirm to enable app lock');
      if (!result.success) {
        // User cancelled or authentication failed — don't enable
        return;
      }
    } else {
      // Require a biometric challenge to confirm identity before disabling
      const available = await biometrics.isAvailable();
      if (available) {
        const result = await biometrics.authenticate('Confirm to disable app lock');
        if (!result.success) {
          return;
        }
      }
    }

    await security.setBiometricEnabled(value);
    security.recordAuthentication();
  };

  const handleAutoLockChange = async (value: number) => {
    setShowAutoLockPicker(false);
    await security.setAutoLockTimeout(value);
  };

  const handleScreenSecurityChange = async (value: boolean) => {
    if (value) {
      showAlert({
        title: 'Screen Security Enabled',
        message: 'Screenshots and screen recording will be blocked when viewing sensitive health data.',
        type: 'info',
      });
    }
    await security.setScreenSecurityEnabled(value);
  };

  const handleExportData = () => {
    navigation.navigate('ExportHealthData');
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (e) {
      showAlert({ title: 'Error', message: 'Unable to open privacy policy. Please try again later.', type: 'error' });
    }
  };

  const getAutoLockLabel = () => {
    const option = AUTO_LOCK_OPTIONS.find(o => o.value === security.autoLockTimeout);
    return option?.label || '5 minutes';
  };

  const biometricLabel = security.biometricMethodName
    ? `${security.biometricMethodName} Lock`
    : 'Face ID / Biometric Lock';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy & Security</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Protect your health data</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* AUTHENTICATION Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>AUTHENTICATION</Text>

        {/* Biometric Lock */}
        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Fingerprint color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{biometricLabel}</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Secure app access with biometrics</Text>
          </View>
          <Switch
            value={security.biometricEnabled}
            onValueChange={handleBiometricChange}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* Auto-Lock (disabled when biometric lock is OFF) */}
        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, !security.biometricEnabled && styles.settingCardDisabled]}
          activeOpacity={security.biometricEnabled ? 0.8 : 1}
          onPress={() => security.biometricEnabled && setShowAutoLockPicker(!showAutoLockPicker)}
        >
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }, !security.biometricEnabled && { opacity: 0.4 }]}>
            <Clock color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }, !security.biometricEnabled && { opacity: 0.4 }]}>Auto-Lock</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
              {security.biometricEnabled ? 'Lock after inactivity' : 'Enable biometric lock first'}
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: colors.cyan }, !security.biometricEnabled && { opacity: 0.4 }]}>
              {getAutoLockLabel()}
            </Text>
            <ChevronDown color={colors.textMuted} size={18} />
          </View>
        </TouchableOpacity>

        {showAutoLockPicker && (
          <View style={[styles.pickerDropdown, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
            {AUTO_LOCK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  { borderBottomColor: colors.border },
                  security.autoLockTimeout === option.value && [styles.pickerOptionSelected, { backgroundColor: colors.cyanDim }],
                ]}
                onPress={() => handleAutoLockChange(option.value)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: colors.textSecondary },
                    security.autoLockTimeout === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* DATA MANAGEMENT Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>DATA MANAGEMENT</Text>

        {/* Export Health Data */}
        <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleExportData}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Download color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Export Health Data</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Generate PDF summary</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handlePrivacyPolicy}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <FileText color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Review our data practices</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* ADDITIONAL SECURITY Section */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>ADDITIONAL SECURITY</Text>

        {/* Data Encryption - Info only, no interaction */}
        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Shield color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Data Encryption</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>AES-256 encryption enabled</Text>
          </View>
          <View style={styles.statusBadge}>
            <Lock color={colors.success} size={14} />
            <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
          </View>
        </View>

        {/* Screen Security - Toggle */}
        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Eye color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Screen Security</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Block screenshots & app switcher</Text>
          </View>
          <Switch
            value={security.screenSecurityEnabled}
            onValueChange={handleScreenSecurityChange}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* Screen Security Granularity (visible only when security is ON) */}
        {security.screenSecurityEnabled && (
          <View style={[styles.granularityCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.granularityLabel, { color: colors.textMuted }]}>Protected screens</Text>
            <TouchableOpacity
              style={[
                styles.granularityOption,
                security.screenSecurityGranularity === 'sensitive_only' && styles.granularityOptionSelected,
              ]}
              onPress={() => security.setScreenSecurityGranularity('sensitive_only')}
            >
              <View style={[styles.radioOuter, { borderColor: colors.cyan }]}>
                {security.screenSecurityGranularity === 'sensitive_only' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.cyan }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.granularityOptionText, { color: colors.textPrimary }]}>Sensitive screens only</Text>
                <Text style={[styles.granularityOptionSub, { color: colors.textMuted }]}>Emergency Vault, medications, personal info (7 screens)</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.granularityOption,
                security.screenSecurityGranularity === 'all' && styles.granularityOptionSelected,
              ]}
              onPress={() => security.setScreenSecurityGranularity('all')}
            >
              <View style={[styles.radioOuter, { borderColor: colors.cyan }]}>
                {security.screenSecurityGranularity === 'all' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.cyan }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.granularityOptionText, { color: colors.textPrimary }]}>All screens</Text>
                <Text style={[styles.granularityOptionSub, { color: colors.textMuted }]}>Includes Home, Cabinet, Insights, and more (11 screens)</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Health Data Protection Notice */}
        <View style={[styles.noticeCard, { borderLeftColor: colors.cyan, backgroundColor: colors.cyanDim }]}>
          <View style={styles.noticeHeader}>
            <Info color={colors.cyan} size={18} />
            <Text style={[styles.noticeTitle, { color: colors.cyan }]}>Health Data Protection</Text>
          </View>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Your health data is protected with industry-standard AES-256 encryption. Vitalic complies
            with App Store Health guidelines and does not share your data with third parties. You can
            export your complete medication history at any time.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
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

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  settingCardDisabled: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Picker Dropdown
  pickerDropdown: {
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {},
  pickerOptionText: {
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
  },

  // Granularity Card
  granularityCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    marginTop: -6,
    borderWidth: 1,
  },
  granularityLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  granularityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  granularityOptionSelected: {},
  granularityOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  granularityOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Danger Card
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  dangerSubtitle: {
    fontSize: 12,
  },

  // Notice Card
  noticeCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 3,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
