import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Switch from '../primitives/Switch';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';

export default function AppPreferencesScreen({ navigation }: RootStackScreenProps<'AppPreferences'>) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>App Preferences</Text>
          <View style={{ width: 40 }} />
        </View>

        <Switch label="Reduced Motion" value={reducedMotion} onValueChange={setReducedMotion} />
        <Switch label="Haptic Feedback" value={hapticFeedback} onValueChange={setHapticFeedback} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEME</Text>
          <Text style={styles.sectionValue}>Dark (Default)</Text>
        </View>
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
  section: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  sectionValue: { color: colors.textPrimary, fontSize: 15 },
});
