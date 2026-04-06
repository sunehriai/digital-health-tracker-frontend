/**
 * OutOfScansModal — shown when a free user with 0 AI scan credits
 * attempts to scan a medication. Offers Upgrade or Add Manually.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  onUpgrade: () => void;
  onAddManually: () => void;
  onDismiss: () => void;
}

export default function OutOfScansModal({ visible, onUpgrade, onAddManually, onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.cyanDim }]}>
            <Sparkles color={colors.cyan} size={28} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Out of AI Scans
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            You've used all your free AI scans. Upgrade to Premium for unlimited scans, or add your medication manually.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.cyan }]}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={onAddManually}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Add Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14 },
});
