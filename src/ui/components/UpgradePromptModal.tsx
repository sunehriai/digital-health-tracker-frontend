/**
 * UpgradePromptModal — reusable modal prompting user to upgrade to premium.
 *
 * Props:
 *   visible: boolean
 *   featureName: string — e.g. "Emergency Vault"
 *   description: string — value prop text
 *   onUpgrade: () => void — navigates to PaywallScreen
 *   onDismiss: () => void
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  featureName: string;
  description: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function UpgradePromptModal({ visible, featureName, description, onUpgrade, onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Unlock {featureName}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {description}
          </Text>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: colors.cyan }]}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>Maybe Later</Text>
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
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  upgradeBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14 },
});
