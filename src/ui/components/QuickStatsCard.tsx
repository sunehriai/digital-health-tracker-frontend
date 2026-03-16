/**
 * QuickStatsCard — Animated stats card for the adherence screen.
 *
 * Three animated stat circles (adherence ring, streak flame, best week star)
 * plus a shimmering milestone progress bar below.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Flame, Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { QuickStatsResponse } from '../../domain/types';

const RING_SIZE = 80;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface Props {
  stats: QuickStatsResponse | null;
  loading?: boolean;
}

export default function QuickStatsCard({ stats, loading }: Props) {
  const { colors } = useTheme();

  // -- Animation values --
  const flamePulse = useRef(new Animated.Value(1)).current;
  const starBounce = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Ring animation: use state-driven dashoffset (non-native) with counter
  const [ringOffset, setRingOffset] = useState(RING_CIRCUMFERENCE);
  const ringAnimRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!stats || loading) return;

    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 1. Ring fill via listener (SVG props can't use native driver)
    const pct = stats.rolling_adherence_pct ?? 0;
    const targetOffset = RING_CIRCUMFERENCE * (1 - pct / 100);
    ringAnimRef.setValue(RING_CIRCUMFERENCE);

    const listenerId = ringAnimRef.addListener(({ value }) => {
      setRingOffset(value);
    });

    Animated.timing(ringAnimRef, {
      toValue: targetOffset,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // 2. Flame pulse (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(flamePulse, {
          toValue: 1.18,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flamePulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 3. Star bounce-in
    starBounce.setValue(0);
    Animated.spring(starBounce, {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
      delay: 400,
    }).start();

    // 4. Milestone shimmer (continuous)
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    return () => {
      ringAnimRef.removeListener(listenerId);
    };
  }, [stats, loading]);

  if (loading || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.loadingPlaceholder}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading stats...</Text>
        </View>
      </View>
    );
  }

  const adherencePct = stats.rolling_adherence_pct ?? 0;
  const perfectMonthsLabel = stats.total_months_this_year > 0
    ? `${stats.perfect_months}/${stats.total_months_this_year}`
    : `${stats.perfect_months}`;
  const milestoneProgress = stats.milestone_target
    ? stats.milestone_progress / stats.milestone_target
    : 0;

  // Ring glow color based on adherence
  const ringColor = adherencePct >= 80 ? colors.cyan : adherencePct >= 50 ? '#F59E0B' : '#F87171';

  // Shimmer translateX for milestone bar
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 300],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.bgCard, borderColor: colors.border, opacity: fadeIn },
      ]}
    >
      {/* Three stat circles */}
      <View style={styles.statsRow}>
        {/* Adherence Ring */}
        <View style={styles.statItem}>
          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Background track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.bgSubtle}
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              {/* Animated fill (state-driven) */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                fill="transparent"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            {/* Center text */}
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color: colors.textPrimary }]}>
                {Math.round(adherencePct)}%
              </Text>
            </View>
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>3-mo avg</Text>
        </View>

        {/* Best Streak (3-mo) */}
        <View style={styles.statItem}>
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(255, 69, 0, 0.12)', transform: [{ scale: flamePulse }] },
            ]}
          >
            <Flame
              color="#FF4500"
              size={20}
              strokeWidth={2}
              fill="#FF4500"
            />
            <Text style={[styles.iconValue, { color: colors.textPrimary }]}>
              {stats.best_streak_days}
            </Text>
          </Animated.View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>best streak</Text>
          <Text style={[styles.statSubLabel, { color: colors.textMuted }]}>(Days)</Text>
        </View>

        {/* Perfect Months (this year) */}
        <View style={styles.statItem}>
          <Animated.View
            style={[
              styles.iconCircle,
              {
                backgroundColor: 'rgba(251, 191, 36, 0.12)',
                transform: [{ scale: starBounce }],
              },
            ]}
          >
            <Trophy
              color="#FBBF24"
              size={20}
              strokeWidth={2}
            />
            <Text style={[styles.iconValue, { color: colors.textPrimary }]}>
              {perfectMonthsLabel}
            </Text>
          </Animated.View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>perfect months</Text>
        </View>
      </View>

      {/* Milestone progress bar */}
      {stats.milestone_label && stats.milestone_target && (
        <View style={styles.milestoneSection}>
          <View style={styles.milestoneHeader}>
            <Trophy color="#FBBF24" size={14} strokeWidth={2} />
            <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
              {stats.milestone_label}
            </Text>
          </View>
          <View style={[styles.milestoneTrack, { backgroundColor: colors.bgSubtle }]}>
            <View
              style={[
                styles.milestoneFill,
                {
                  width: `${Math.min(milestoneProgress * 100, 100)}%`,
                  backgroundColor: '#FBBF24',
                },
              ]}
            />
            {/* Shimmer overlay */}
            <Animated.View
              style={[
                styles.shimmer,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  loadingPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  iconCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  milestoneSection: {
    marginTop: 16,
    gap: 6,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  milestoneTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  milestoneFill: {
    height: '100%',
    borderRadius: 3,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
});
