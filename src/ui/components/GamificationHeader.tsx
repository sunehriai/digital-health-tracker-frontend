/**
 * GamificationHeader -- self-contained gamification status bar.
 *
 * Displays the current tier badge (PNG), XP progress bar with
 * "X XP to [Next Tier]" label, streak fire icon + count, and
 * comeback boost countdown when active.
 *
 * Step 37: Real-time countdown for comeback boost ("2x XP -- Xh Xm left").
 * Step 38: Server-authoritative XP display (D17 sync indicator).
 *
 * Uses useGamification() internally so that re-renders are isolated
 * from the parent screen (R5.3).
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Flame, Zap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGamification } from '../hooks/useGamification';
import { TIER_ASSETS, TIER_NAMES, TIER_THRESHOLDS, getTierAsset } from '../../domain/constants/tierAssets';
import { useTheme } from '../theme/ThemeContext';
import GlowRing from './GlowRing';
import type { RootStackParamList } from '../navigation/types';

const BADGE_SIZE = 36;

/**
 * Format hours left into a human-readable countdown string.
 * e.g., 47.3 -> "47h 18m", 2.0 -> "2h 0m", 0.5 -> "30m"
 */
function formatBoostCountdown(hoursLeft: number): string {
  if (hoursLeft <= 0) return '';
  const totalMinutes = Math.max(0, Math.floor(hoursLeft * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function GamificationHeader() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const {
    totalXp,
    currentTier,
    tierName,
    streakDays,
    xpToNextTier,
    nextTierName,
    comebackBoostActive,
    comebackBoostHoursLeft,
    isOnline,
    loading,
  } = useGamification();

  // Step 37: Real-time countdown state
  const [countdownText, setCountdownText] = useState<string>('');
  const [boostExpired, setBoostExpired] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialHoursRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Step 37: Manage real-time countdown for comeback boost
  useEffect(() => {
    // Clear any existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (comebackBoostActive && comebackBoostHoursLeft !== null && comebackBoostHoursLeft > 0) {
      // Record the initial hours left and the timestamp
      initialHoursRef.current = comebackBoostHoursLeft;
      startTimeRef.current = Date.now();
      setBoostExpired(false);
      setCountdownText(formatBoostCountdown(comebackBoostHoursLeft));

      // Update every 60 seconds
      countdownRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / (1000 * 3600);
        const remaining = (initialHoursRef.current ?? 0) - elapsed;
        if (remaining <= 0) {
          setBoostExpired(true);
          setCountdownText('');
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        } else {
          setCountdownText(formatBoostCountdown(remaining));
        }
      }, 60000);
    } else {
      setCountdownText('');
      setBoostExpired(!comebackBoostActive);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [comebackBoostActive, comebackBoostHoursLeft]);

  const showBoost = comebackBoostActive && !boostExpired && countdownText.length > 0;

  const currentThreshold = TIER_THRESHOLDS[currentTier] ?? 0;
  const nextThreshold = TIER_THRESHOLDS[currentTier + 1] ?? null;
  let progressPercent = 1;
  if (nextThreshold !== null) {
    const range = nextThreshold - currentThreshold;
    const progress = totalXp - currentThreshold;
    progressPercent = range > 0 ? Math.min(1, Math.max(0, progress / range)) : 1;
  }

  const badgeSource = getTierAsset(currentTier, isDark);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.middle}>
        <View style={styles.xpRow}>
          <Text style={[styles.tierLabel, { color: colors.textPrimary }]}>{tierName}</Text>
          {xpToNextTier !== null && nextTierName ? (
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {xpToNextTier < 20
                ? `Final Dose to ${nextTierName}!`
                : `${isOnline ? '' : '~'}${xpToNextTier} XP to ${nextTierName}`}
            </Text>
          ) : (
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {isOnline ? '' : '~'}{totalXp.toLocaleString()} XP — {tierName}
            </Text>
          )}
        </View>

        <View style={{ position: 'relative', overflow: 'visible' }}>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgSubtle }]}>
            <View style={[styles.progressFill, { width: `${progressPercent * 100}%`, backgroundColor: colors.cyan }]} />
          </View>
          <GlowRing streakDays={streakDays} color={colors.cyanGlow} size={44} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.streakRow}>
          <Flame
            color={streakDays >= 3 ? '#FF4500' : '#FF6B35'}
            size={16}
            strokeWidth={2}
            fill={streakDays >= 3 ? '#FF4500' : 'transparent'}
          />
          <Text style={styles.streakText}>{streakDays}</Text>
        </View>

        {/* Step 37: Comeback Boost with real-time countdown */}
        {showBoost && (
          <View style={styles.boostBadge}>
            <Zap color="#FFD700" size={10} strokeWidth={2.5} fill="#FFD700" />
            <Text style={styles.boostText}>2x XP — {countdownText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  placeholder: {
    height: BADGE_SIZE,
  },
  badgeTouch: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    overflow: 'hidden',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  boostText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '700',
  },
});
