/**
 * High-Dopamine 7-Day Vitality Score Component
 *
 * Features:
 * - Dynamic bar colors (amber/orange for low, glowing cyan for 90+)
 * - Streak fire icon with pulsing glow animation (streak >= 3)
 * - 'Zen Master' badge with shimmer effect (average > 90)
 * - Animated bars filling from bottom
 * - Success burst particle effect on goal completion
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, Flame, Award, Sparkles } from 'lucide-react-native';
// LinearGradient commented out - not available on web
// import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolateColor,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useGamification } from '../hooks/useGamification';
import { gamificationService } from '../../data/services/gamificationService';
import type { XpEvent } from '../../domain/types';

// Day labels
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Color constants
const COLORS = {
  lowScore: '#F59E0B',      // Amber for low scores
  lowScoreGlow: '#FF6B00',  // Orange glow
  midScore: '#22D3EE',      // Cyan for mid scores
  highScore: '#00D1FF',     // Electric cyan for 90+
  highScoreGlow: '#00F5FF', // Bright cyan glow
  zenBadge: '#FFD700',      // Gold for Zen Master
  flameLow: '#FF6B35',      // Flame color for low streak
  flameHigh: '#FF4500',     // Flame color for high streak
};

/**
 * Build a 7-element array (Mon-Sun) of XP earned per day for the current week.
 * Sums ALL XP events per day (daily + one-time events that have an event_date).
 */
function buildWeeklyXp(events: XpEvent[]): number[] {
  // Sum XP by date
  const dateXpMap: Record<string, number> = {};
  for (const e of events) {
    if (e.event_date) {
      dateXpMap[e.event_date] = (dateXpMap[e.event_date] ?? 0) + e.points;
    }
  }

  // Get current week's Mon-Sun dates
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const xpPerDay: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().split('T')[0];
    xpPerDay.push(dateXpMap[key] ?? 0);
  }
  return xpPerDay;
}

interface VitalityScoreCardProps {
  /** Callback when success burst should trigger */
  onDailyGoalComplete?: () => void;
}

interface ParticleProps {
  index: number;
  onComplete: () => void;
}

// Particle component for success burst
function Particle({ index, onComplete }: ParticleProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const angle = (index / 12) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;

    translateX.value = withTiming(Math.cos(angle) * distance, { duration: 800 });
    translateY.value = withTiming(Math.sin(angle) * distance - 20, { duration: 800 });
    scale.value = withSequence(
      withTiming(1.5, { duration: 200 }),
      withTiming(0, { duration: 600 })
    );
    opacity.value = withDelay(400, withTiming(0, { duration: 400 }));
    rotation.value = withTiming(360, { duration: 800 });

    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const particleColors = ['#00D1FF', '#FFD700', '#FF6B35', '#22C55E', '#FF4500'];
  const color = particleColors[index % particleColors.length];

  return (
    <Animated.View style={[styles.particle, animatedStyle, { backgroundColor: color }]} />
  );
}

// Success burst container
function SuccessBurst({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (active) {
      setParticles(Array.from({ length: 12 }, (_, i) => i));
    }
  }, [active]);

  const handleParticleComplete = useCallback(() => {
    setParticles((prev) => {
      if (prev.length <= 1) {
        onComplete();
        return [];
      }
      return prev.slice(1);
    });
  }, [onComplete]);

  if (!active && particles.length === 0) return null;

  return (
    <View style={styles.burstContainer}>
      {particles.map((index) => (
        <Particle key={`${index}-${Date.now()}`} index={index} onComplete={handleParticleComplete} />
      ))}
    </View>
  );
}

// Maximum bar height in pixels (scaled to 75%)
const MAX_BAR_HEIGHT = 60;

// Animated bar component
function VitalityBar({
  score,
  dayLabel,
  index,
  isToday,
  maxScore,
}: {
  score: number;
  dayLabel: string;
  index: number;
  isToday: boolean;
  maxScore: number;
}) {
  const heightAnim = useSharedValue(8);
  const glowAnim = useSharedValue(0);

  // Calculate bar height relative to max daily XP (min 8px if non-zero)
  const barHeightPx = score === 0
    ? 4
    : Math.max(8, (score / maxScore) * MAX_BAR_HEIGHT);

  // Determine color based on XP value
  const isHighScore = score >= 30;  // ~day 10+ streak bonus
  const isMidScore = score >= 14;   // ~day 2+ streak bonus

  useEffect(() => {
    // Staggered animation for each bar
    heightAnim.value = withDelay(
      index * 100,
      withSpring(barHeightPx, { damping: 12, stiffness: 100 })
    );

    // Glow animation for high scores
    if (isHighScore) {
      glowAnim.value = withDelay(
        index * 100 + 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    }
  }, [score, index, isHighScore]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    height: heightAnim.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
    shadowOpacity: glowAnim.value * 0.8,
  }));

  // Solid color based on score (gradient not available on web)
  const barColor = isHighScore
    ? COLORS.highScore
    : isMidScore
    ? COLORS.midScore
    : COLORS.lowScore;

  return (
    <View style={styles.barWrapper}>
      <View style={styles.barContainer}>
        {/* Animated bar with solid color */}
        <Animated.View
          style={[
            styles.bar,
            barAnimatedStyle,
            { backgroundColor: barColor }
          ]}
        />
        {isHighScore && (
          <Animated.View
            style={[
              styles.barGlow,
              glowAnimatedStyle,
              { shadowColor: COLORS.highScoreGlow },
            ]}
          />
        )}
        {/* Score label on top of bar */}
        <Animated.Text
          entering={FadeIn.delay(index * 100 + 500)}
          style={[styles.scoreOnBar, isHighScore && styles.scoreOnBarHigh]}
        >
          {score}
        </Animated.Text>
      </View>
      <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{dayLabel}</Text>
      {isToday && <View style={styles.todayDot} />}
    </View>
  );
}

// Streak flame component with pulsing glow
function StreakFlame({ streakDays }: { streakDays: number }) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  const hasStreak = streakDays >= 3;

  useEffect(() => {
    if (hasStreak) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [hasStreak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hasStreak ? pulseScale.value : 1 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: hasStreak ? glowOpacity.value : 0,
  }));

  const flameColor = hasStreak ? COLORS.flameHigh : COLORS.flameLow;

  return (
    <Animated.View style={[styles.flameContainer, flameStyle]}>
      {hasStreak && (
        <Animated.View
          style={[
            styles.flameGlow,
            glowStyle,
            { shadowColor: flameColor, backgroundColor: flameColor },
          ]}
        />
      )}
      <Flame
        color={flameColor}
        size={18}
        strokeWidth={2}
        fill={hasStreak ? flameColor : 'transparent'}
      />
    </Animated.View>
  );
}

// Zen Master badge with shimmer
function ZenMasterBadge() {
  const shimmerPosition = useSharedValue(-100);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(200, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.zenBadge}>
      <View style={styles.zenBadgeInner}>
        <Award color={COLORS.zenBadge} size={10} strokeWidth={2} />
        <Text style={styles.zenBadgeText}>ZEN MASTER</Text>
        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>
    </Animated.View>
  );
}

export default function VitalityScoreCard({
  onDailyGoalComplete,
}: VitalityScoreCardProps) {
  const { streakDays } = useGamification();
  const [showBurst, setShowBurst] = useState(false);
  const [dailyXp, setDailyXp] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Fetch XP history and derive weekly XP per day
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await gamificationService.getHistory(0, 50);
        if (mounted) {
          setDailyXp(buildWeeklyXp(data.events));
        }
      } catch {
        // Keep zeros on failure
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Weekly total XP and max daily XP (for scaling bars)
  const weeklyTotal = dailyXp.reduce((a, b) => a + b, 0);
  const maxDailyXp = Math.max(...dailyXp, 1); // avoid div by 0
  const isZenMaster = dailyXp.every((xp) => xp > 0); // all 7 days had XP

  // Get today's index (0 = Monday, 6 = Sunday)
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to index 6

  // Score animation
  const scoreAnim = useSharedValue(0);

  useEffect(() => {
    scoreAnim.value = withTiming(weeklyTotal, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [weeklyTotal]);

  const scoreStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      scoreAnim.value,
      [0, 30, 80, 150],
      [COLORS.lowScore, COLORS.midScore, COLORS.highScore, COLORS.highScoreGlow]
    );
    return { color };
  });

  // Trigger success burst
  const triggerSuccessBurst = useCallback(() => {
    setShowBurst(true);
    onDailyGoalComplete?.();
  }, [onDailyGoalComplete]);

  return (
    <View style={styles.container}>
      {/* Success burst overlay */}
      <SuccessBurst active={showBurst} onComplete={() => setShowBurst(false)} />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Activity color={colors.cyan} size={12} strokeWidth={2} />
          <Text style={styles.headerText}>7-DAY VITALITY SCORE</Text>
        </View>
        {isZenMaster && <ZenMasterBadge />}
      </View>

      {/* Score display with streak */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreRow}>
          <Animated.Text style={[styles.scoreValue, scoreStyle]}>{weeklyTotal}</Animated.Text>
          <Text style={styles.scoreMax}>XP</Text>
          <View style={styles.streakContainer}>
            <StreakFlame streakDays={streakDays} />
            <Text style={styles.streakText}>{streakDays} day streak</Text>
          </View>
        </View>
        <Text style={styles.scoreLabel}>This Week</Text>
      </View>

      {/* Animated bar chart */}
      <View style={styles.chartContainer}>
        <View style={styles.barChartContainer}>
          {dailyXp.map((score, index) => (
            <VitalityBar
              key={index}
              score={score}
              dayLabel={DAY_LABELS[index]}
              index={index}
              isToday={index === todayIndex}
              maxScore={maxDailyXp}
            />
          ))}
        </View>
      </View>

      {/* Sparkles decoration for high averages */}
      {isZenMaster && (
        <View style={styles.sparklesContainer}>
          <Sparkles color={COLORS.zenBadge} size={9} style={styles.sparkle1} />
          <Sparkles color={colors.cyan} size={7} style={styles.sparkle2} />
          <Sparkles color={COLORS.zenBadge} size={6} style={styles.sparkle3} />
        </View>
      )}
    </View>
  );
}

// Export trigger function for external use
export function useVitalityBurst() {
  const [trigger, setTrigger] = useState(0);
  const triggerBurst = useCallback(() => setTrigger((t) => t + 1), []);
  return { burstKey: trigger, triggerBurst };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 216, 255, 0.25)',
    overflow: 'hidden',
    position: 'relative',
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    color: colors.cyan,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Score
  scoreContainer: {
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 209, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreMax: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  // Streak
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  flameContainer: {
    position: 'relative',
  },
  flameGlow: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: -2,
    left: -2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 6,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  // Chart
  chartContainer: {
    height: 100,
    marginTop: 4,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingTop: 16,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 60,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
  },
  barGlow: {
    position: 'absolute',
    top: 0,
    left: -3,
    right: -3,
    bottom: 0,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 4,
  },
  scoreOnBar: {
    position: 'absolute',
    top: -14,
    color: '#9CA3AF',
    fontSize: 8,
    fontWeight: '600',
  },
  scoreOnBarHigh: {
    color: colors.cyan,
    textShadowColor: 'rgba(0, 209, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  barLabel: {
    color: '#6B7280',
    fontSize: 8,
    fontWeight: '500',
    marginTop: 6,
  },
  barLabelToday: {
    color: colors.cyan,
    fontWeight: '700',
  },
  todayDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.cyan,
    marginTop: 3,
  },
  // Zen Master badge
  zenBadge: {
    overflow: 'hidden',
    borderRadius: 9,
  },
  zenBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
  },
  zenBadgeText: {
    color: COLORS.zenBadge,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  // Sparkles
  sparklesContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  sparkle1: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.6,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 22,
    right: 18,
    opacity: 0.4,
  },
  sparkle3: {
    position: 'absolute',
    top: 36,
    right: 32,
    opacity: 0.5,
  },
  // Success burst
  burstContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
