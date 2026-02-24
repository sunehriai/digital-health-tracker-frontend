/**
 * LockedFeatureScreen — shown when a user tries to access a feature
 * that is gated behind a higher tier.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Lock, ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TIER_ASSETS, TIER_NAMES, TIER_THRESHOLDS } from '../../domain/constants/tierAssets';
import { colors } from '../theme/colors';

interface LockedFeatureScreenProps {
  featureLabel: string;
  requiredTier: number;
  currentTier: number;
  currentXp: number;
}

export default function LockedFeatureScreen({
  featureLabel,
  requiredTier,
  currentTier,
  currentXp,
}: LockedFeatureScreenProps) {
  const navigation = useNavigation();

  const requiredTierName = TIER_NAMES[requiredTier] ?? 'Unknown';
  const requiredXp = TIER_THRESHOLDS[requiredTier] ?? 0;
  const xpNeeded = Math.max(0, requiredXp - currentXp);

  const currentBadge = TIER_ASSETS[currentTier];
  const requiredBadge = TIER_ASSETS[requiredTier];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft color={colors.textSecondary} size={24} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.lockCircle}>
            <Lock color="#FFD700" size={32} strokeWidth={2} />
          </View>

          <Text style={styles.title}>{featureLabel}</Text>
          <Text style={styles.subtitle}>This feature is locked</Text>

          <View style={styles.tierRow}>
            <View style={styles.tierBadge}>
              <Image source={currentBadge} style={styles.badgeImage} resizeMode="contain" />
              <Text style={styles.tierBadgeLabel}>{TIER_NAMES[currentTier] ?? 'Observer'}</Text>
              <Text style={styles.tierBadgeSub}>Current</Text>
            </View>

            <View style={styles.arrowDots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <View style={styles.tierBadge}>
              <View style={styles.requiredBadgeWrap}>
                <Image
                  source={requiredBadge}
                  style={[styles.badgeImage, styles.badgeImageLocked]}
                  resizeMode="contain"
                />
                <View style={styles.miniLock}>
                  <Lock color="#FFD700" size={12} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={styles.tierBadgeLabel}>{requiredTierName}</Text>
              <Text style={styles.tierBadgeSub}>Required</Text>
            </View>
          </View>

          <View style={styles.xpCard}>
            <Text style={styles.xpNeeded}>{xpNeeded.toLocaleString()} XP</Text>
            <Text style={styles.xpLabel}>needed to unlock</Text>
          </View>

          <Text style={styles.encouragement}>
            Keep logging your medications daily to earn XP and unlock {featureLabel}!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  lockCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2, borderColor: 'rgba(255, 215, 0, 0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 14, fontWeight: '500', marginBottom: 32, textAlign: 'center' },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 32 },
  tierBadge: { alignItems: 'center', gap: 6 },
  badgeImage: { width: 56, height: 56 },
  badgeImageLocked: { opacity: 0.35 },
  requiredBadgeWrap: { position: 'relative' },
  miniLock: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.bg, borderRadius: 10, padding: 2 },
  tierBadgeLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  tierBadgeSub: { color: colors.textMuted, fontSize: 10, fontWeight: '500' },
  arrowDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  xpCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 24,
  },
  xpNeeded: { color: colors.cyan, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  xpLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  encouragement: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
