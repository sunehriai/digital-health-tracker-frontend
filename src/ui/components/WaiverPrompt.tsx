/**
 * WaiverPrompt — Modal that appears when the user opens the app after
 * missing yesterday's doses while holding waiver badges.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Shield } from 'lucide-react-native';
import { WAIVER_BADGE_ASSET } from '../../domain/constants/tierAssets';
import { gamificationService } from '../../data/services/gamificationService';
import { colors } from '../theme/colors';

interface WaiverPromptProps {
  visible: boolean;
  waiverBadges: number;
  streakDays: number;
  onBadgeUsed: () => void;
  onDismiss: () => void;
}

export default function WaiverPrompt({
  visible,
  waiverBadges,
  streakDays,
  onBadgeUsed,
  onDismiss,
}: WaiverPromptProps) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseBadge = async () => {
    setActivating(true);
    setError(null);
    try {
      await gamificationService.activateWaiver();
      onBadgeUsed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate waiver badge');
    } finally {
      setActivating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Image source={WAIVER_BADGE_ASSET} style={styles.badgeImage} resizeMode="contain" />
          </View>

          <Text style={styles.title}>Protect Your Streak?</Text>
          <Text style={styles.subtitle}>
            You missed doses yesterday. Use a Waiver Badge to protect your{' '}
            <Text style={styles.streakHighlight}>{streakDays}-day streak</Text>.
          </Text>

          <View style={styles.badgeCountRow}>
            <Shield color="#FFD700" size={16} strokeWidth={2} />
            <Text style={styles.badgeCountText}>
              {waiverBadges} badge{waiverBadges !== 1 ? 's' : ''} remaining
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7} disabled={activating}>
              <Text style={styles.dismissText}>Let it go</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.useBtn, activating && styles.useBtnDisabled]}
              onPress={handleUseBadge} activeOpacity={0.8} disabled={activating}
            >
              {activating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.useText}>Use Badge</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: 24, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  badgeImage: { width: 56, height: 56 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  streakHighlight: { color: '#F59E0B', fontWeight: '700' },
  badgeCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.08)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 12, marginBottom: 20,
  },
  badgeCountText: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
  errorText: { color: colors.error, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  dismissBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center',
  },
  dismissText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  useBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FFD700', alignItems: 'center' },
  useBtnDisabled: { opacity: 0.6 },
  useText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
