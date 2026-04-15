import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import DateInput from '../../components/DateInput';
import Button from '../../primitives/Button';
import { getMedNameToggle, setMedNameToggle } from '../../../data/utils/notifications';

const getEighteenYearsAgo = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateAge = (dobString: string): number => {
  const [y, m, d] = dobString.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }
  return age;
};

export default function AgeGateScreen() {
  const { updateProfile, signOut } = useAuth();
  const { showAlert } = useAlert();
  const { colors } = useTheme();

  const [dob, setDob] = useState(getEighteenYearsAgo());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PHI privacy toggle
  const [showMedNames, setShowMedNames] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    getMedNameToggle().then(setShowMedNames);
  }, []);

  const handleToggleOn = () => {
    // Show disclosure before enabling
    setShowDisclosure(true);
  };

  const handleToggleOff = () => {
    setShowMedNames(false);
    setMedNameToggle(false);
  };

  const handleDisclosureAllow = () => {
    setShowMedNames(true);
    setMedNameToggle(true);
    setShowDisclosure(false);
  };

  const handleDisclosureKeepOff = () => {
    setShowDisclosure(false);
    // Toggle stays OFF, no persistence needed
  };

  const handleContinue = async () => {
    setError(null);
    const age = calculateAge(dob);

    if (age >= 18) {
      setLoading(true);
      try {
        const result = await updateProfile({ date_of_birth: dob });
        if (!result.success) {
          setError(result.error || 'Failed to save. Please try again.');
          setLoading(false);
        } else {
          // Persist gate completion so it won't reappear when backend is unreachable
          await AsyncStorage.setItem('@vitalic:age_gate_completed', 'true');
        }
        // On success: AppNavigator auto-transitions because user.date_of_birth is now set
      } catch {
        setError('Failed to save. Please try again.');
        setLoading(false);
      }
    } else {
      showAlert({
        title: 'Age Requirement',
        message: 'You must be 18 or older to use Vitalic. Your account will be removed.',
        type: 'error',
        onConfirm: async () => {
          try {
            await auth().currentUser?.delete();
          } catch {
            // If delete fails (e.g. re-auth required), sign out anyway
          }
          await signOut();
        },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[typography.h2, styles.title, { color: colors.textPrimary }]}>
            One more thing...
          </Text>
          <Text style={[typography.bodySmall, styles.subtitle, { color: colors.textSecondary }]}>
            Vitalic is designed for users 18 and older. Please confirm your date of birth.
          </Text>
        </View>

        <View style={styles.dateSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
          <DateInput value={dob} onChange={setDob} maxDate={getEighteenYearsAgo()} minDate="1920-01-01" />
        </View>

        {/* PHI Privacy Toggle */}
        <View style={[styles.privacySection, { borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Show Medication Names in Notifications
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                When off, notifications use generic text to protect your privacy.
              </Text>
            </View>
            <Switch
              value={showMedNames}
              onValueChange={(value) => value ? handleToggleOn() : handleToggleOff()}
              trackColor={{ false: colors.border, true: colors.cyan }}
            />
          </View>
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          disabled={loading || showDisclosure}
          loading={loading}
        />

        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

      {/* Disclosure Modal */}
      <Modal
        visible={showDisclosure}
        transparent
        animationType="fade"
        onRequestClose={handleDisclosureKeepOff}
      >
        <Pressable style={styles.modalOverlay} onPress={handleDisclosureKeepOff}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.bgCard }]} onPress={() => {}}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: 12 }]}>
              Medication Names in Notifications
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Turning this on allows Vitalic to show your specific medication names in your
              reminders. To do this, a secure signal is sent to your device via Apple/Google
              services. While your health data is encrypted, these providers will facilitate
              the delivery of the notification to your lock screen.{'\n\n'}You can choose
              &quot;Keep Off&quot; for maximum privacy.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Keep Off"
                onPress={handleDisclosureKeepOff}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Allow"
                onPress={handleDisclosureAllow}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  privacySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
