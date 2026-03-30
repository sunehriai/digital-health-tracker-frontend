/**
 * WinBackModal — shown once, 14 days after trial expiry.
 * Displays accumulated XP/tier and a discounted subscribe CTA.
 * Dismissed permanently via AsyncStorage flag.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { TIER_NAMES } from '../../domain/constants/tierAssets';

const WIN_BACK_KEY = '@vitalic:win_back_shown';

export default function WinBackModal() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { shouldShowWinBackModal } = useSubscription();
  const [visible, setVisible] = useState(false);
  const [xp, setXp] = useState(0);
  const [tier, setTier] = useState(1);

  useEffect(() => {
    (async () => {
      const result = await shouldShowWinBackModal();
      if (result.show) {
        setXp(result.xpAccumulated);
        setTier(result.tier);
        setVisible(true);
      }
    })();
  }, [shouldShowWinBackModal]);

  const handleDismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(WIN_BACK_KEY, 'true');
  };

  const handleUpgrade = async () => {
    setVisible(false);
    await AsyncStorage.setItem(WIN_BACK_KEY, 'true');
    navigation.navigate('Paywall');
  };

  const tierName = TIER_NAMES[tier] ?? 'Seeker';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.title, { color: colors.cyan }]}>Welcome Back!</Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            You've earned {xp.toLocaleString()} XP and reached{' '}
            <Text style={{ fontWeight: '700', color: colors.cyan }}>{tierName}</Text>!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock your progress and see everything you've built.
          </Text>

          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.cyan }]}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Unlock My Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
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
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, textAlign: 'center', marginBottom: 8, lineHeight: 22 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  ctaBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14 },
});
