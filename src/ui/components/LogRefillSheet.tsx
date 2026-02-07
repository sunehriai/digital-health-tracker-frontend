import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from '../primitives/Modal';
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import { colors } from '../theme/colors';

interface LogRefillSheetProps {
  medicationName: string;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export default function LogRefillSheet({ medicationName, onClose, onConfirm }: LogRefillSheetProps) {
  const [quantity, setQuantity] = useState('30');

  const presets = [15, 30, 60, 90];

  return (
    <Modal visible onClose={onClose} title={`Refill ${medicationName}`}>
      <Text style={styles.label}>Quantity Added</Text>
      <Input
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        placeholder="Enter quantity"
        containerStyle={styles.inputContainer}
      />

      <View style={styles.presetRow}>
        {presets.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.presetChip, quantity === String(p) && styles.presetChipActive]}
            onPress={() => setQuantity(String(p))}
          >
            <Text style={[styles.presetText, quantity === String(p) && styles.presetTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Confirm Refill"
        onPress={() => {
          const q = parseInt(quantity, 10);
          if (q > 0) onConfirm(q);
        }}
        disabled={!quantity || parseInt(quantity, 10) <= 0}
        style={styles.confirmBtn}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: { marginBottom: 16 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  presetChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border,
  },
  presetChipActive: { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
  presetText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  presetTextActive: { color: colors.cyan },
  confirmBtn: { marginTop: 8 },
});
