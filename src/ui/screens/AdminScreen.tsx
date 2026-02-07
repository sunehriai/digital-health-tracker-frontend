import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { RootStackScreenProps } from '../navigation/types';

export default function AdminScreen({ navigation }: RootStackScreenProps<'Admin'>) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Command Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Status</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>API Connection</Text>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Firebase Auth</Text>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Database</Text>
            <View style={styles.statusDot} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Platform: React Native + Expo</Text>
          <Text style={styles.debugText}>Auth: @react-native-firebase/auth</Text>
          <Text style={styles.debugText}>Backend: FastAPI</Text>
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
  card: {
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 16, letterSpacing: 0.3 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  statLabel: { color: colors.textSecondary, fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  debugText: { color: colors.textMuted, fontSize: 13, marginBottom: 4, fontFamily: 'monospace' },
});
