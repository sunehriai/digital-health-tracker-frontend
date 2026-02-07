import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Switch from '../primitives/Switch';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';

export default function NotificationPrefsScreen({ navigation }: RootStackScreenProps<'NotificationPrefs'>) {
  const [doseReminders, setDoseReminders] = useState(true);
  const [refillAlerts, setRefillAlerts] = useState(true);
  const [streakNotifs, setStreakNotifs] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <Switch label="Dose Reminders" value={doseReminders} onValueChange={setDoseReminders} />
        <Switch label="Refill Alerts" value={refillAlerts} onValueChange={setRefillAlerts} />
        <Switch label="Streak Milestones" value={streakNotifs} onValueChange={setStreakNotifs} />
        <Switch label="Quiet Hours (10pm - 7am)" value={quietHours} onValueChange={setQuietHours} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 8 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
});
