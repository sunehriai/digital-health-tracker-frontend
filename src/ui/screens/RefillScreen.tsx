import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Check } from 'lucide-react-native';
import { useMedications } from '../hooks/useMedications';
import { colors } from '../theme/colors';
import type { Medication } from '../../domain/types';
import LogRefillSheet from '../components/LogRefillSheet';

export default function RefillScreen() {
  const { medications, refillMedication } = useMedications();
  const [refillTarget, setRefillTarget] = useState<Medication | null>(null);

  const lowStockMeds = medications.filter(
    (m) => !m.is_archived && m.initial_stock > 0 && (m.current_stock / m.initial_stock) * 100 < 15
  );

  const handleRefill = useCallback(async (quantity: number) => {
    if (!refillTarget) return;
    try {
      await refillMedication(refillTarget.id, quantity);
      setRefillTarget(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [refillTarget, refillMedication]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Vitality Feed</Text>
          <Text style={styles.subtitle}>Tap an alert to restock medication</Text>
        </View>

        {/* Low stock alerts */}
        {lowStockMeds.map((med) => {
          const pct = med.initial_stock > 0 ? (med.current_stock / med.initial_stock) * 100 : 0;
          return (
            <TouchableOpacity
              key={med.id}
              style={styles.alertCard}
              activeOpacity={0.8}
              onPress={() => setRefillTarget(med)}
            >
              <View style={styles.alertRow}>
                <View style={styles.alertIcon}>
                  <AlertTriangle color="#FB7185" size={24} strokeWidth={2.5} />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertTitleRow}>
                    <Text style={styles.alertTitle}>Low Supply Alert</Text>
                    <Text style={styles.alertCount}>{med.current_stock} Left</Text>
                  </View>
                  <Text style={styles.alertBody}>
                    <Text style={styles.alertMedName}>{med.name} {med.strength || ''}</Text>
                    {' '}inventory is critically low.
                  </Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                  <TouchableOpacity style={styles.refillBtn} onPress={() => setRefillTarget(med)}>
                    <Text style={styles.refillBtnText}>LOG REFILL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {lowStockMeds.length === 0 && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Check color="#050505" size={32} strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>All Stocked Up</Text>
            <Text style={styles.successBody}>No medications need refilling right now.</Text>
          </View>
        )}

        {/* Inventory overview */}
        {medications
          .filter((m) => !m.is_archived)
          .map((med) => {
            const pct = med.initial_stock > 0 ? Math.min((med.current_stock / med.initial_stock) * 100, 100) : 0;
            const barColor = pct >= 30 ? colors.cyan : '#FB7185';
            return (
              <View key={med.id} style={styles.stockCard}>
                <View style={styles.stockRow}>
                  <View>
                    <Text style={styles.stockLabel}>CURRENT STOCK</Text>
                    <Text style={styles.stockName}>{med.name} {med.strength || ''}</Text>
                  </View>
                  <View style={styles.stockCountCol}>
                    <Text style={styles.stockNumber}>{med.current_stock}</Text>
                    <Text style={styles.stockUnit}>pills</Text>
                  </View>
                </View>
                <View style={styles.stockBarBg}>
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
  safe: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  alertCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    backgroundColor: 'rgba(251,113,133,0.08)', borderWidth: 2, borderColor: 'rgba(251,113,133,0.3)',
  },
  alertRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  alertIcon: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(251,113,133,0.2)', borderWidth: 2, borderColor: 'rgba(251,113,133,0.4)',
  },
  alertContent: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  alertTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  alertCount: { color: '#FB7185', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  alertBody: { color: '#94A3B8', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  alertMedName: { color: colors.textPrimary, fontWeight: '600' },
  progressBg: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#FB7185' },
  refillBtn: {
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FB7185',
  },
  refillBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  successCard: {
    borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center',
    backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 2, borderColor: 'rgba(0,229,255,0.3)',
  },
  successIcon: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    backgroundColor: colors.cyan,
  },
  successTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  successBody: { color: '#94A3B8', fontSize: 14 },
  stockCard: {
    borderRadius: 16, padding: 24, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  stockLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  stockName: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  stockCountCol: { alignItems: 'flex-end' },
  stockNumber: { color: colors.textPrimary, fontSize: 32, fontWeight: '700', fontFamily: 'monospace' },
  stockUnit: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  stockBarBg: { height: 12, backgroundColor: '#1E293B', borderRadius: 6, overflow: 'hidden' },
  stockBarFill: { height: 12, borderRadius: 6 },
});
