import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from '../primitives/Modal';
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import { useTheme } from '../theme/ThemeContext';

interface LogRefillSheetProps {
  medicationName: string;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export default function LogRefillSheet({ medicationName, onClose, onConfirm }: LogRefillSheetProps) {
  const { colors } = useTheme();
  const [quantity, setQuantity] = useState('30');

  const presets = [15, 30, 60, 90];

  return (
    <Modal visible onClose={onClose} title={`Refill ${medicationName}`}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity Added</Text>
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
            style={[
              styles.presetChip,
              { backgroundColor: colors.bgElevated, borderColor: colors.border },
              quantity === String(p) && { backgroundColor: colors.cyanDim, borderColor: colors.cyan },
            ]}
            onPress={() => setQuantity(String(p))}
          >
            <Text style={[
              styles.presetText,
              { color: colors.textSecondary },
              quantity === String(p) && { color: colors.cyan },
            ]}>{p}</Text>
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
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: { marginBottom: 16 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  presetChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1,
  },
  presetText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: { marginTop: 8 },
});
