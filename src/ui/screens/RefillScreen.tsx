import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Check } from 'lucide-react-native';
import { useMedications } from '../hooks/useMedications';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../theme/ThemeContext';
import { calculateLowStockDoses } from '../../domain/medicationConfig';
import { getDoseTimes } from '../../domain/utils';
import type { Medication } from '../../domain/types';
import LogRefillSheet from '../components/LogRefillSheet';

export default function RefillScreen() {
  const { colors, isDark } = useTheme();
  const { medications, refillMedication } = useMedications();
  const { prefs: notifPrefs } = useNotificationPrefs();
  const { showAlert } = useAlert();
  const [refillTarget, setRefillTarget] = useState<Medication | null>(null);

  const thresholdDays = notifPrefs?.low_stock_threshold_days ?? 7;

  const lowStockMeds = useMemo(() => medications.filter((m) => {
    if (m.is_archived || m.initial_stock <= 0) return false;
    const dosesPerDay = getDoseTimes(m).length;
    const threshold = calculateLowStockDoses(m.dose_size || 1, dosesPerDay, thresholdDays);
    return m.current_stock < threshold;
  }), [medications, thresholdDays]);

  const handleRefill = useCallback(async (quantity: number) => {
    if (!refillTarget) return;
    try {
      await refillMedication(refillTarget.id, quantity);
      setRefillTarget(null);
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    }
  }, [refillTarget, refillMedication]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Vitality Feed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tap an alert to restock medication</Text>
        </View>

        {/* Low stock alerts */}
        {lowStockMeds.map((med) => {
          const pct = med.initial_stock > 0 ? (med.current_stock / med.initial_stock) * 100 : 0;
          return (
            <TouchableOpacity
              key={med.id}
              style={[styles.alertCard, { backgroundColor: isDark ? 'rgba(251,113,133,0.08)' : 'rgba(225,29,72,0.06)', borderColor: isDark ? 'rgba(251,113,133,0.3)' : 'rgba(225,29,72,0.2)' }]}
              activeOpacity={0.8}
              onPress={() => setRefillTarget(med)}
            >
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: isDark ? 'rgba(251,113,133,0.2)' : 'rgba(225,29,72,0.1)', borderColor: isDark ? 'rgba(251,113,133,0.4)' : 'rgba(225,29,72,0.25)' }]}>
                  <AlertTriangle color={isDark ? '#FB7185' : '#E11D48'} size={24} strokeWidth={2.5} />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertTitleRow}>
                    <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>Low Supply Alert</Text>
                    <Text style={[styles.alertCount, { color: isDark ? '#FB7185' : '#E11D48' }]}>{med.current_stock} Left</Text>
                  </View>
                  <Text style={[styles.alertBody, { color: colors.textSecondary }]}>
                    <Text style={[styles.alertMedName, { color: colors.textPrimary }]}>{med.name} {med.strength || ''}</Text>
                    {' '}inventory is critically low.
                  </Text>
                  <View style={[styles.progressBg, { backgroundColor: colors.bgCard }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isDark ? '#FB7185' : '#E11D48' }]} />
                  </View>
                  <TouchableOpacity style={[styles.refillBtn, { backgroundColor: isDark ? '#FB7185' : '#E11D48' }]} onPress={() => setRefillTarget(med)}>
                    <Text style={[styles.refillBtnText, { color: colors.textPrimary }]}>LOG REFILL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {lowStockMeds.length === 0 && (
          <View style={[styles.successCard, { backgroundColor: isDark ? 'rgba(0,229,255,0.08)' : 'rgba(0,180,216,0.08)', borderColor: isDark ? 'rgba(0,229,255,0.3)' : 'rgba(0,180,216,0.25)' }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.cyan }]}>
              <Check color={colors.bg} size={32} strokeWidth={3} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>All Stocked Up</Text>
            <Text style={[styles.successBody, { color: colors.textSecondary }]}>No medications need refilling right now.</Text>
          </View>
        )}

        {/* Inventory overview */}
        {medications
          .filter((m) => !m.is_archived)
          .map((med) => {
            const pct = med.initial_stock > 0 ? Math.min((med.current_stock / med.initial_stock) * 100, 100) : 0;
            const barColor = pct >= 30 ? colors.cyan : (isDark ? '#FB7185' : '#E11D48');
            return (
              <View key={med.id} style={[styles.stockCard, { backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle }]}>
                <View style={styles.stockRow}>
                  <View>
                    <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>CURRENT STOCK</Text>
                    <Text style={[styles.stockName, { color: colors.textPrimary }]}>{med.name} {med.strength || ''}</Text>
                  </View>
                  <View style={styles.stockCountCol}>
                    <Text style={[styles.stockNumber, { color: colors.textPrimary }]}>{med.current_stock}</Text>
                    <Text style={[styles.stockUnit, { color: colors.textMuted }]}>pills</Text>
                  </View>
                </View>
                <View style={[styles.stockBarBg, { backgroundColor: colors.bgCard }]}>
                  <View style={[styles.stockBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
      </ScrollView>

      {/* Refill bottom sheet */}
      {refillTarget && (
        <LogRefillSheet
          medicationName={refillTarget.name}
          onClose={() => setRefillTarget(null)}
          onConfirm={handleRefill}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  alertCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 2,
  },
  alertRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  alertIcon: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  alertContent: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  alertTitle: { fontSize: 16, fontWeight: '700' },
  alertCount: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  alertBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  alertMedName: { fontWeight: '600' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 8, borderRadius: 4 },
  refillBtn: {
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  refillBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  successCard: {
    borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center',
    borderWidth: 2,
  },
  successIcon: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  successTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  successBody: { fontSize: 14 },
  stockCard: {
    borderRadius: 16, padding: 24, marginBottom: 12,
    borderWidth: 1.5,
  },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  stockLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  stockName: { fontSize: 18, fontWeight: '700' },
  stockCountCol: { alignItems: 'flex-end' },
  stockNumber: { fontSize: 32, fontWeight: '700', fontFamily: 'monospace' },
  stockUnit: { fontSize: 12, fontWeight: '600' },
  stockBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  stockBarFill: { height: 12, borderRadius: 6 },
});
