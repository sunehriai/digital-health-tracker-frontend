import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Pill, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { medicationService } from '../../data/services/medicationService';
import { medicationEvents } from '../../data/utils/medicationEvents';
import { getOccurrenceCount, calculateLowStockDoses } from '../../domain/medicationConfig';
import type { Medication } from '../../domain/types';

interface LowStockModalProps {
  medications: Medication[];
  thresholdDays: number;
  onClose?: () => void;
}

export interface LowStockModalRef {
  expand: () => void;
  close: () => void;
}

interface RefillRowState {
  open: boolean;
  amount: string;
  loading: boolean;
  error: string | null;
}

function getDosesPerDay(med: Medication): number {
  if (med.dose_times && med.dose_times.length > 0) {
    return med.dose_times.length;
  }
  return getOccurrenceCount(med.occurrence);
}

function getDaysRemaining(med: Medication): number | null {
  if (med.is_as_needed) return null;
  const dpd = getDosesPerDay(med);
  if (dpd <= 0 || med.dose_size <= 0) return null;
  return Math.floor(med.current_stock / (med.dose_size * dpd));
}

export default React.forwardRef<LowStockModalRef, LowStockModalProps>(
  function LowStockModal({ medications, thresholdDays, onClose }, ref) {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [refillState, setRefillState] = useState<Record<string, RefillRowState>>({});
    const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
    const [fadeAnims] = useState<Record<string, Animated.Value>>({});

    useImperativeHandle(ref, () => ({
      expand: () => setVisible(true),
      close: () => setVisible(false),
    }));

    const visibleMeds = useMemo(
      () => medications.filter((m) => !resolvedIds.has(m.id)),
      [medications, resolvedIds],
    );

    // Auto-dismiss when all rows resolved
    useEffect(() => {
      if (visible && medications.length > 0 && visibleMeds.length === 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          onClose?.();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [visible, visibleMeds.length, medications.length, onClose]);

    // Reset state when modal opens
    useEffect(() => {
      if (visible) {
        setRefillState({});
        setResolvedIds(new Set());
      }
    }, [visible]);

    const handleClose = useCallback(() => {
      setVisible(false);
      onClose?.();
    }, [onClose]);

    const handleOpenRefill = useCallback((medId: string) => {
      setRefillState((prev) => ({
        ...prev,
        [medId]: { open: true, amount: '', loading: false, error: null },
      }));
    }, []);

    const handleConfirmRefill = useCallback(
      async (med: Medication) => {
        const state = refillState[med.id];
        if (!state) return;

        const amount = parseInt(state.amount, 10);
        if (isNaN(amount) || amount <= 0) {
          setRefillState((prev) => ({
            ...prev,
            [med.id]: { ...prev[med.id], error: 'Enter a valid amount' },
          }));
          return;
        }

        setRefillState((prev) => ({
          ...prev,
          [med.id]: { ...prev[med.id], loading: true, error: null },
        }));

        try {
          await medicationService.refill(med.id, amount);
          medicationEvents.emit('medication_updated', med.id);

          const newStock = med.current_stock + amount;
          const threshold = calculateLowStockDoses(
            med.dose_size,
            getDosesPerDay(med),
            thresholdDays,
          );

          if (newStock >= threshold) {
            const anim = new Animated.Value(1);
            fadeAnims[med.id] = anim;
            Animated.timing(anim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setResolvedIds((prev) => new Set([...prev, med.id]));
            });
          } else {
            setRefillState((prev) => ({
              ...prev,
              [med.id]: { open: false, amount: '', loading: false, error: null },
            }));
          }
        } catch {
          setRefillState((prev) => ({
            ...prev,
            [med.id]: {
              ...prev[med.id],
              loading: false,
              error: 'Could not log refill. Try again.',
            },
          }));
        }
      },
      [refillState, thresholdDays, fadeAnims],
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={[styles.card, { backgroundColor: colors.bgCard }]} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Low Stock</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollArea} bounces={false}>
              {visibleMeds.length === 0 && medications.length > 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>All stocked up!</Text>
              ) : (
                visibleMeds.map((med) => {
                  const days = getDaysRemaining(med);
                  const daysText = days !== null ? `~${days} day${days !== 1 ? 's' : ''}` : '\u2014';
                  const state = refillState[med.id];
                  const opacity = fadeAnims[med.id] || new Animated.Value(1);

                  return (
                    <Animated.View
                      key={med.id}
                      style={[
                        styles.medCard,
                        {
                          backgroundColor: colors.bg,
                          borderColor: 'rgba(245, 158, 11, 0.2)',
                          opacity,
                        },
                      ]}
                    >
                      <View style={styles.medRow}>
                        <View style={styles.medInfo}>
                          <View style={styles.nameRow}>
                            <Pill size={14} color="#F59E0B" />
                            <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {med.name}
                            </Text>
                          </View>
                          <Text style={[styles.stockText, { color: colors.textMuted }]}>
                            {med.current_stock} doses left · {daysText}
                          </Text>
                        </View>
                        {!state?.open && (
                          <TouchableOpacity
                            style={styles.refillBtn}
                            onPress={() => handleOpenRefill(med.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.refillBtnText}>Refill</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {state?.open && (
                        <View style={styles.refillInputRow}>
                          <TextInput
                            style={[
                              styles.input,
                              {
                                color: colors.textPrimary,
                                borderColor: state.error ? '#EF4444' : colors.textMuted,
                                backgroundColor: colors.bgCard,
                              },
                            ]}
                            placeholder="Amount"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={state.amount}
                            onChangeText={(text) =>
                              setRefillState((prev) => ({
                                ...prev,
                                [med.id]: { ...prev[med.id], amount: text, error: null },
                              }))
                            }
                            editable={!state.loading}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[styles.confirmBtn, state.loading && styles.confirmBtnDisabled]}
                            onPress={() => handleConfirmRefill(med)}
                            disabled={state.loading}
                            activeOpacity={0.7}
                          >
                            {state.loading ? (
                              <ActivityIndicator size="small" color="#F59E0B" />
                            ) : (
                              <Text style={styles.confirmBtnText}>Confirm</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                      {state?.error && (
                        <Text style={styles.errorText}>{state.error}</Text>
                      )}
                    </Animated.View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollArea: {
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    paddingVertical: 16,
  },
  medCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  stockText: {
    fontSize: 13,
    marginTop: 4,
  },
  refillBtn: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  refillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  refillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  confirmBtn: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
});
