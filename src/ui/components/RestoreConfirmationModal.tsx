import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import Modal from '../primitives/Modal';
import Button from '../primitives/Button';
import { useTheme } from '../theme/ThemeContext';

interface RestoreConfirmationModalProps {
  visible: boolean;
  medicationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestoreConfirmationModal({
  visible,
  medicationName,
  onConfirm,
  onCancel,
}: RestoreConfirmationModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} onClose={onCancel} title="Restore Medication">
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.cyanDim }]}>
          <RotateCcw color={colors.cyan} size={32} />
        </View>
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          Restore <Text style={styles.bold}>{medicationName}</Text> to your active medications?
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          This will move it back to your active list and resume any scheduled doses.
        </Text>
        <View style={styles.actions}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.btn} />
          <Button title="Restore" onPress={onConfirm} style={styles.btn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center' },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  bold: { fontWeight: '700' },
  detail: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1 },
});
