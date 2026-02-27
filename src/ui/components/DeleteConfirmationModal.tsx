import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Trash2, UserX } from 'lucide-react-native';
import Modal from '../primitives/Modal';
import Button from '../primitives/Button';
import { colors } from '../theme/colors';

interface DeleteConfirmationModalProps {
  visible: boolean;
  deletionType: 'data_only' | 'full_account';
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const COPY = {
  data_only: {
    title: 'Delete All Health Data?',
    icon: Trash2,
    message:
      'This will permanently delete all your medications, dose history, vitality feed, emergency vault, and gamification progress.',
    detail:
      'Your account and login will be preserved. This action is immediate and cannot be undone.',
    confirmLabel: 'Delete My Data',
  },
  full_account: {
    title: 'Delete Your Account?',
    icon: UserX,
    message:
      'This will permanently delete your account and all associated data including medications, dose history, vitality feed, emergency vault, and gamification progress.',
    detail:
      'You have 30 days to change your mind by signing back in. After that, your account and all data will be permanently removed.',
    confirmLabel: 'Delete My Account',
  },
};

export default function DeleteConfirmationModal({
  visible,
  deletionType,
  loading,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  console.log('[DeleteConfirmationModal] render — visible:', visible, 'deletionType:', deletionType, 'loading:', loading);
  const copy = COPY[deletionType];
  const Icon = copy.icon;

  const handleConfirmPress = () => {
    console.log('[DeleteConfirmationModal] CONFIRM button pressed — deletionType:', deletionType);
    onConfirm();
  };

  const handleCancelPress = () => {
    console.log('[DeleteConfirmationModal] CANCEL button pressed');
    onCancel();
  };

  return (
    <Modal visible={visible} onClose={handleCancelPress} title={copy.title}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon color={colors.error} size={32} />
        </View>
        <Text style={styles.message}>{copy.message}</Text>
        <Text style={styles.detail}>{copy.detail}</Text>
        {loading ? (
          <>
            {console.log('[DeleteConfirmationModal] showing loading spinner')}
            <ActivityIndicator size="small" color={colors.error} style={{ marginVertical: 16 }} />
          </>
        ) : (
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={handleCancelPress} style={styles.btn} />
            <Button title={copy.confirmLabel} variant="danger" onPress={handleConfirmPress} style={styles.btn} />
          </View>
        )}
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  message: {
    color: colors.textPrimary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1 },
});
