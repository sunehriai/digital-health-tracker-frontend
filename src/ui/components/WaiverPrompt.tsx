/**
 * WaiverPrompt — Modal that appears when the user opens the app after
 * missing yesterday's doses while holding waiver badges.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Shield } from 'lucide-react-native';
import { WAIVER_BADGE_ASSET } from '../../domain/constants/tierAssets';
import { gamificationService } from '../../data/services/gamificationService';
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
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
      <View style={[styles.overlay, { backgroundColor: colors.overlayHeavy }]}>
        <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
          <View style={styles.iconContainer}>
            <Image source={WAIVER_BADGE_ASSET} style={styles.badgeImage} resizeMode="contain" />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Protect Your Streak?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You missed doses yesterday. Use a Waiver Badge to protect your{' '}
            <Text style={styles.streakHighlight}>{streakDays}-day streak</Text>.
          </Text>

          <View style={styles.badgeCountRow}>
            <Shield color="#FF6B35" size={16} strokeWidth={2} />
            <Text style={styles.badgeCountText}>
              {waiverBadges} badge{waiverBadges !== 1 ? 's' : ''} remaining
            </Text>
          </View>

          {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.dismissBtn, { borderColor: colors.borderSubtle }]} onPress={onDismiss} activeOpacity={0.7} disabled={activating}>
              <Text style={[styles.dismissText, { color: colors.textSecondary }]}>Let it go</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.useBtn, activating && styles.useBtnDisabled]}
              onPress={handleUseBadge} activeOpacity={0.8} disabled={activating}
            >
              {activating ? (
                <ActivityIndicator size="small" color="#FFF" />
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
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    borderRadius: 24, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  badgeImage: { width: 56, height: 56 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  streakHighlight: { color: '#FF6B35', fontWeight: '700' },
  badgeCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.08)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 12, marginBottom: 20,
  },
  badgeCountText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  errorText: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  dismissBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    alignItems: 'center',
  },
  dismissText: { fontSize: 14, fontWeight: '600' },
  useBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#00BCD4', alignItems: 'center' },
  useBtnDisabled: { opacity: 0.6 },
  useText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
