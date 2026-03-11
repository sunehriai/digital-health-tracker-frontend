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
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
  const navigation = useNavigation();

  const requiredTierName = TIER_NAMES[requiredTier] ?? 'Unknown';
  const requiredXp = TIER_THRESHOLDS[requiredTier] ?? 0;
  const xpNeeded = Math.max(0, requiredXp - currentXp);

  const currentBadge = TIER_ASSETS[currentTier];
  const requiredBadge = TIER_ASSETS[requiredTier];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft color={colors.textSecondary} size={24} strokeWidth={2} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.lockCircle}>
            <Lock color="#FFD700" size={32} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{featureLabel}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>This feature is locked</Text>

          <View style={styles.tierRow}>
            <View style={styles.tierBadge}>
              <Image source={currentBadge} style={styles.badgeImage} resizeMode="contain" />
              <Text style={[styles.tierBadgeLabel, { color: colors.textPrimary }]}>{TIER_NAMES[currentTier] ?? 'Observer'}</Text>
              <Text style={[styles.tierBadgeSub, { color: colors.textMuted }]}>Current</Text>
            </View>

            <View style={styles.arrowDots}>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
            </View>

            <View style={styles.tierBadge}>
              <View style={styles.requiredBadgeWrap}>
                <Image
                  source={requiredBadge}
                  style={[styles.badgeImage, styles.badgeImageLocked]}
                  resizeMode="contain"
                />
                <View style={[styles.miniLock, { backgroundColor: colors.bg }]}>
                  <Lock color="#FFD700" size={12} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={[styles.tierBadgeLabel, { color: colors.textPrimary }]}>{requiredTierName}</Text>
              <Text style={[styles.tierBadgeSub, { color: colors.textMuted }]}>Required</Text>
            </View>
          </View>

          <View style={[styles.xpCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.xpNeeded, { color: colors.cyan }]}>{xpNeeded.toLocaleString()} XP</Text>
            <Text style={[styles.xpLabel, { color: colors.textMuted }]}>needed to unlock</Text>
          </View>

          <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
            Keep logging your medications daily to earn XP and unlock {featureLabel}!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  backText: { fontSize: 15, fontWeight: '500' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  lockCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2, borderColor: 'rgba(255, 215, 0, 0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '500', marginBottom: 32, textAlign: 'center' },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 32 },
  tierBadge: { alignItems: 'center', gap: 6 },
  badgeImage: { width: 56, height: 56 },
  badgeImageLocked: { opacity: 0.35 },
  requiredBadgeWrap: { position: 'relative' },
  miniLock: { position: 'absolute', bottom: -2, right: -2, borderRadius: 10, padding: 2 },
  tierBadgeLabel: { fontSize: 12, fontWeight: '600' },
  tierBadgeSub: { fontSize: 10, fontWeight: '500' },
  arrowDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  xpCard: {
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, marginBottom: 24,
  },
  xpNeeded: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  xpLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  encouragement: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
