import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import DateInput from '../../components/DateInput';
import Button from '../../primitives/Button';

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
          await AsyncStorage.setItem('@vitaquest:age_gate_completed', 'true');
        }
        // On success: AppNavigator auto-transitions because user.date_of_birth is now set
      } catch {
        setError('Failed to save. Please try again.');
        setLoading(false);
      }
    } else {
      showAlert({
        title: 'Age Requirement',
        message: 'You must be 18 or older to use VitaQuest. Your account will be removed.',
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
            VitaQuest is designed for users 18 and older. Please confirm your date of birth.
          </Text>
        </View>

        <View style={styles.dateSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
          <DateInput value={dob} onChange={setDob} maxDate={getEighteenYearsAgo()} />
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          disabled={loading}
          loading={loading}
        />

        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>
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
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
