import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSecurity } from '../hooks/useSecurity';
import { setApiBase } from '../../data/api/client';
import type { RootStackScreenProps } from '../navigation/types';

const API_ENVIRONMENTS = [
  { label: 'Dev (Local)', url: null as string | null },
  { label: 'Dev (Android)', url: 'http://10.0.2.2:8000' },
  { label: 'Staging', url: 'https://staging-api.vision.app' },
  { label: 'Production', url: 'https://api.vision.app' },
];

export default function AdminScreen({ navigation }: RootStackScreenProps<'Admin'>) {
  const { colors } = useTheme();
  const security = useSecurity();
  const [selectedEnv, setSelectedEnv] = useState(0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Admin Command Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>System Status</Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>API Connection</Text>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Firebase Auth</Text>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Database</Text>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Debug Info</Text>
          <Text style={[styles.debugText, { color: colors.textMuted }]}>Platform: React Native + Expo</Text>
          <Text style={[styles.debugText, { color: colors.textMuted }]}>Auth: @react-native-firebase/auth</Text>
          <Text style={[styles.debugText, { color: colors.textMuted }]}>Backend: FastAPI</Text>
        </View>

        {__DEV__ && (
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Developer Options</Text>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Force Screen Security in DEV</Text>
                <Text style={[styles.debugText, { color: colors.textMuted }]}>
                  Override __DEV__ bypass for useScreenSecurity
                </Text>
              </View>
              <Switch
                value={security.devForceScreenSecurity}
                onValueChange={security.setDevForceScreenSecurity}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Step 37: API Environment Selector */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.statLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                API Environment
              </Text>
              {API_ENVIRONMENTS.map((env, index) => (
                <TouchableOpacity
                  key={env.label}
                  style={styles.envRow}
                  onPress={() => {
                    setSelectedEnv(index);
                    setApiBase(env.url);
                  }}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: selectedEnv === index ? colors.cyan : colors.border },
                    ]}
                  >
                    {selectedEnv === index && (
                      <View style={[styles.radioInner, { backgroundColor: colors.cyan }]} />
                    )}
                  </View>
                  <Text style={[styles.envLabel, { color: colors.textPrimary }]}>{env.label}</Text>
                  {env.url && (
                    <Text style={[styles.debugText, { color: colors.textMuted, marginLeft: 8, marginBottom: 0 }]}>
                      {env.url}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Step 37: Reset Onboarding (placeholder) */}
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border }]}
              onPress={() => {
                // TODO: Clear relevant AsyncStorage onboarding keys
              }}
            >
              <Text style={[styles.statLabel, { color: colors.warning }]}>Reset Onboarding</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  card: {
    borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 16, letterSpacing: 0.3 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  statLabel: { fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  debugText: { fontSize: 13, marginBottom: 4, fontFamily: 'monospace' },
  envRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  envLabel: { fontSize: 14, fontWeight: '500' },
  resetBtn: {
    marginTop: 20, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, alignItems: 'center',
  },
});
