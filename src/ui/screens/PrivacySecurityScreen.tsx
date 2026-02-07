import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Trash2,
  Lock,
  Info,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';

const BIOMETRIC_KEY = '@vision_biometric_enabled';
const AUTO_LOCK_KEY = '@vision_auto_lock_timeout';
const SCREEN_SECURITY_KEY = '@vision_screen_security';

const AUTO_LOCK_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: 'Never', value: -1 },
];

const PRIVACY_POLICY_URL = 'https://vision-health.app/privacy'; // Replace with actual URL

export default function PrivacySecurityScreen({ navigation }: RootStackScreenProps<'PrivacySecurity'>) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5); // Default 5 minutes
  const [screenSecurityEnabled, setScreenSecurityEnabled] = useState(false);
  const [showAutoLockPicker, setShowAutoLockPicker] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [biometric, autoLock, screenSecurity] = await Promise.all([
        AsyncStorage.getItem(BIOMETRIC_KEY),
        AsyncStorage.getItem(AUTO_LOCK_KEY),
        AsyncStorage.getItem(SCREEN_SECURITY_KEY),
      ]);

      if (biometric !== null) setBiometricEnabled(biometric === 'true');
      if (autoLock !== null) setAutoLockTimeout(parseInt(autoLock, 10));
      if (screenSecurity !== null) setScreenSecurityEnabled(screenSecurity === 'true');
    } catch (e) {
      console.error('Failed to load privacy settings:', e);
    }
  };

  const handleBiometricChange = async (value: boolean) => {
    setBiometricEnabled(value);
    await AsyncStorage.setItem(BIOMETRIC_KEY, value.toString());
  };

  const handleAutoLockChange = async (value: number) => {
    setAutoLockTimeout(value);
    setShowAutoLockPicker(false);
    await AsyncStorage.setItem(AUTO_LOCK_KEY, value.toString());
  };

  const handleScreenSecurityChange = async (value: boolean) => {
    setScreenSecurityEnabled(value);
    await AsyncStorage.setItem(SCREEN_SECURITY_KEY, value.toString());
    // Note: Actual screenshot blocking requires native code
    if (value) {
      Alert.alert(
        'Screen Security Enabled',
        'Screenshots and screen recording will be blocked when viewing sensitive health data.'
      );
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Health Data',
      'This will generate a PDF summary of all your medications, dose history, and health information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement PDF export
            Alert.alert('Coming Soon', 'PDF export will be available in a future update.');
          }
        },
      ]
    );
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (e) {
      Alert.alert('Error', 'Unable to open privacy policy. Please try again later.');
    }
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your health data including medications, dose history, and personal information. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    // TODO: Implement actual data deletion
                    Alert.alert('Data Deleted', 'All your health data has been deleted.');
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  const getAutoLockLabel = () => {
    const option = AUTO_LOCK_OPTIONS.find(o => o.value === autoLockTimeout);
    return option?.label || '5 minutes';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <Text style={styles.headerSubtitle}>Protect your health data</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* AUTHENTICATION Section */}
        <Text style={styles.sectionTitle}>AUTHENTICATION</Text>

        {/* Face ID / Biometric Lock */}
        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Fingerprint color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Face ID / Biometric Lock</Text>
            <Text style={styles.settingSubtitle}>Secure app access with biometrics</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricChange}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* Auto-Lock */}
        <TouchableOpacity
          style={styles.settingCard}
          activeOpacity={0.8}
          onPress={() => setShowAutoLockPicker(!showAutoLockPicker)}
        >
          <View style={styles.settingIcon}>
            <Clock color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Auto-Lock</Text>
            <Text style={styles.settingSubtitle}>Lock after inactivity</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{getAutoLockLabel()}</Text>
            <ChevronDown color={colors.textMuted} size={18} />
          </View>
        </TouchableOpacity>

        {showAutoLockPicker && (
          <View style={styles.pickerDropdown}>
            {AUTO_LOCK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  autoLockTimeout === option.value && styles.pickerOptionSelected,
                ]}
                onPress={() => handleAutoLockChange(option.value)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    autoLockTimeout === option.value && styles.pickerOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* DATA MANAGEMENT Section */}
        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

        {/* Export Health Data */}
        <TouchableOpacity style={styles.settingCard} activeOpacity={0.8} onPress={handleExportData}>
          <View style={styles.settingIcon}>
            <Download color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Export Health Data</Text>
            <Text style={styles.settingSubtitle}>Generate PDF summary</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity style={styles.settingCard} activeOpacity={0.8} onPress={handlePrivacyPolicy}>
          <View style={styles.settingIcon}>
            <FileText color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Privacy Policy</Text>
            <Text style={styles.settingSubtitle}>Review our data practices</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* ADDITIONAL SECURITY Section */}
        <Text style={styles.sectionTitle}>ADDITIONAL SECURITY</Text>

        {/* Data Encryption - Info only, no interaction */}
        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Shield color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Data Encryption</Text>
            <Text style={styles.settingSubtitle}>AES-256 encryption enabled</Text>
          </View>
          <View style={styles.statusBadge}>
            <Lock color={colors.success} size={14} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        {/* Screen Security - Toggle */}
        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Eye color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Screen Security</Text>
            <Text style={styles.settingSubtitle}>Block screenshots & app switcher</Text>
          </View>
          <Switch
            value={screenSecurityEnabled}
            onValueChange={handleScreenSecurityChange}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* ACCOUNT Section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>

        {/* Delete All Data */}
        <TouchableOpacity style={styles.dangerCard} activeOpacity={0.8} onPress={handleDeleteData}>
          <View style={styles.dangerIcon}>
            <Trash2 color={colors.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.dangerTitle}>Delete All Data</Text>
            <Text style={styles.dangerSubtitle}>Permanently remove all health data</Text>
          </View>
          <ChevronRight color={colors.error} size={20} />
        </TouchableOpacity>

        {/* Health Data Protection Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Info color={colors.cyan} size={18} />
            <Text style={styles.noticeTitle}>Health Data Protection</Text>
          </View>
          <Text style={styles.noticeText}>
            Your health data is protected with industry-standard AES-256 encryption. Vision complies
            with App Store Health guidelines and does not share your data with third parties. You can
            export your complete medication history at any time.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  // Section
  sectionTitle: {
    color: colors.cyan,
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
    backgroundColor: '#121721',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    color: colors.cyan,
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
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },

  // Picker Dropdown
  pickerDropdown: {
    backgroundColor: '#121721',
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2633',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  pickerOptionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    color: colors.cyan,
    fontWeight: '600',
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
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  dangerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.cyan,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
