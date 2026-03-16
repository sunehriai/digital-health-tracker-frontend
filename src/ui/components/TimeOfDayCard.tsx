import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import type { TimeOfDayData, TimeOfDayStats } from '../../domain/types';

interface TimeOfDayCardProps {
  data: TimeOfDayData;
}

const CARD_GAP = 10;

const TIME_RANGES: Record<string, string> = {
  morning: '6am–12pm',
  afternoon: '12–5pm',
  evening: '5–9pm',
  night: '9pm–6am',
};

/* ── Gradient configs ── */

const GRADIENTS = {
  morning: {
    colors: ['#FCD34D', '#F59E0B', '#EA580C'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    glowColor: '#FBBF24',
  },
  afternoon: {
    colors: ['#7DD3FC', '#38BDF8', '#0284C7'] as const,
    start: { x: 0.2, y: 0 },
    end: { x: 0.8, y: 1 },
    glowColor: '#38BDF8',
  },
  evening: {
    colors: ['#F9A8D4', '#EC4899', '#F97316'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    glowColor: '#EC4899',
  },
  night: {
    colors: ['#3B4F99', '#222D6B', '#171F4A'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0.5, y: 1 },
    glowColor: '#6366F1',
  },
} as const;

/* ── Scene overlays with glow spots ── */

function MorningOverlay() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 150 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="mSunGlow" cx="80%" cy="82%" r="50%">
          <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <Stop offset="40%" stopColor="#FCD34D" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
        </RadialGradient>
        {/* Center shine */}
        <RadialGradient id="mShine" cx="45%" cy="40%" r="45%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Diffuse center shine */}
      <Circle cx="68" cy="60" r="60" fill="url(#mShine)" />
      {/* Sun glow */}
      <Circle cx="120" cy="125" r="55" fill="url(#mSunGlow)" />
      {/* Sun body */}
      <Circle cx="120" cy="130" r="26" fill="#FEF3C7" opacity={0.8} />
      <Circle cx="120" cy="130" r="20" fill="#FFFBEB" opacity={0.6} />
      {/* Hill */}
      <Path d="M0 115 Q35 95 75 108 Q115 120 150 105 L150 150 L0 150 Z" fill="rgba(0,0,0,0.08)" />
    </Svg>
  );
}

function AfternoonOverlay() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 150 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="aSunGlow" cx="75%" cy="22%" r="45%">
          <Stop offset="0%" stopColor="#FEF9C3" stopOpacity="0.7" />
          <Stop offset="40%" stopColor="#FDE68A" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="aShine" cx="50%" cy="45%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Center shine */}
      <Circle cx="75" cy="68" r="65" fill="url(#aShine)" />
      {/* Sun glow */}
      <Circle cx="112" cy="32" r="40" fill="url(#aSunGlow)" />
      {/* Sun */}
      <Circle cx="112" cy="32" r="18" fill="#FDE68A" opacity={0.9} />
      <Circle cx="112" cy="32" r="13" fill="#FEF9C3" opacity={0.7} />
      {/* Clouds */}
      <Ellipse cx="35" cy="38" rx="24" ry="10" fill="white" opacity={0.45} />
      <Ellipse cx="25" cy="35" rx="15" ry="7" fill="white" opacity={0.4} />
      <Ellipse cx="80" cy="58" rx="18" ry="7" fill="white" opacity={0.35} />
      <Ellipse cx="72" cy="56" rx="10" ry="5" fill="white" opacity={0.3} />
    </Svg>
  );
}

function EveningOverlay() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 150 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="eSunGlow" cx="55%" cy="72%" r="45%">
          <Stop offset="0%" stopColor="#FDE68A" stopOpacity="0.6" />
          <Stop offset="40%" stopColor="#FB923C" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="eShine" cx="50%" cy="35%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Center shine */}
      <Circle cx="75" cy="52" r="60" fill="url(#eShine)" />
      {/* Sun glow */}
      <Circle cx="82" cy="108" r="50" fill="url(#eSunGlow)" />
      {/* Setting sun */}
      <Circle cx="82" cy="115" r="24" fill="#FBBF24" opacity={0.65} />
      <Circle cx="82" cy="115" r="17" fill="#FDE68A" opacity={0.5} />
      {/* Hills */}
      <Path d="M0 108 Q25 88 55 100 Q90 115 120 95 Q140 85 150 98 L150 150 L0 150 Z" fill="rgba(0,0,0,0.18)" />
    </Svg>
  );
}

function NightOverlay() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 150 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="nMoonGlow" cx="78%" cy="22%" r="45%">
          <Stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.5" />
          <Stop offset="30%" stopColor="#A5B4FC" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </RadialGradient>
        {/* Ambient purple glow in center for richness */}
        <RadialGradient id="nAmbient" cx="40%" cy="55%" r="55%">
          <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
          <Stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Ambient purple glow */}
      <Circle cx="60" cy="82" r="70" fill="url(#nAmbient)" />
      {/* Moon glow */}
      <Circle cx="115" cy="32" r="50" fill="url(#nMoonGlow)" />
      {/* Moon — bright and prominent */}
      <Circle cx="115" cy="32" r="20" fill="#E0E7FF" opacity={0.95} />
      <Circle cx="115" cy="32" r="16" fill="#EEF2FF" opacity={0.5} />
      {/* Moon craters */}
      <Circle cx="108" cy="28" r="4" fill="#C7D2FE" opacity={0.35} />
      <Circle cx="120" cy="36" r="3" fill="#C7D2FE" opacity={0.25} />
      <Circle cx="113" cy="40" r="2" fill="#C7D2FE" opacity={0.2} />
      {/* Stars — bright with glow halos */}
      <Circle cx="18" cy="20" r="3" fill="#E0E7FF" opacity={0.15} />
      <Circle cx="18" cy="20" r="1.8" fill="#F0F0FF" opacity={0.9} />
      <Circle cx="48" cy="12" r="2.5" fill="#E0E7FF" opacity={0.1} />
      <Circle cx="48" cy="12" r="1.2" fill="#F0F0FF" opacity={0.75} />
      <Circle cx="72" cy="30" r="3" fill="#E0E7FF" opacity={0.12} />
      <Circle cx="72" cy="30" r="1.5" fill="#F0F0FF" opacity={0.85} />
      <Circle cx="32" cy="45" r="1" fill="#F0F0FF" opacity={0.6} />
      <Circle cx="85" cy="18" r="2.5" fill="#E0E7FF" opacity={0.1} />
      <Circle cx="85" cy="18" r="1.3" fill="#F0F0FF" opacity={0.7} />
      <Circle cx="55" cy="58" r="0.9" fill="#F0F0FF" opacity={0.5} />
      <Circle cx="15" cy="62" r="1.1" fill="#F0F0FF" opacity={0.45} />
      <Circle cx="40" cy="25" r="0.8" fill="#F0F0FF" opacity={0.55} />
      <Circle cx="68" cy="65" r="1" fill="#F0F0FF" opacity={0.4} />
      <Circle cx="95" cy="55" r="1.1" fill="#F0F0FF" opacity={0.5} />
    </Svg>
  );
}

function InactiveOverlay() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />;
}

/* ── Stagger delays ── */
const STAGGER_DELAYS = [0, 250, 450, 700];

/* ── Single scene card ── */

function SceneCard({
  sceneKey,
  label,
  stats,
  index,
  size,
}: {
  sceneKey: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  stats: TimeOfDayStats | null;
  index: number;
  size: number;
}) {
  const isActive = stats !== null;
  const pct = stats?.percentage ?? 0;
  const pctText = isActive ? `${Math.round(pct)}%` : '—';
  const grad = GRADIENTS[sceneKey];

  // Card pop-in
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  // Number pulse
  const numScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = STAGGER_DELAYS[index] ?? 0;

    const popIn = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(cardScale, {
            toValue: 1.08,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const pulse = Animated.sequence([
      Animated.delay(delay + 750),
      Animated.timing(numScale, {
        toValue: 1.22,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(numScale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([popIn, pulse]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sceneCard,
        {
          width: size,
          height: size,
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
        },
        // Colored glow shadow
        {
          shadowColor: grad.glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 12,
        },
      ]}
    >
      <LinearGradient
        colors={[...grad.colors]}
        start={grad.start}
        end={grad.end}
        style={StyleSheet.absoluteFill}
      />

      {sceneKey === 'morning' && <MorningOverlay />}
      {sceneKey === 'afternoon' && <AfternoonOverlay />}
      {sceneKey === 'evening' && <EveningOverlay />}
      {sceneKey === 'night' && <NightOverlay />}

      {/* Bottom inner shadow for depth */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)']}
        start={{ x: 0.5, y: 0.65 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Top-left shine highlight */}
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {!isActive && <InactiveOverlay />}

      <View style={styles.sceneContent}>
        <Animated.Text
          style={[
            styles.pctValue,
            !isActive && styles.pctInactive,
            { transform: [{ scale: numScale }] },
          ]}
        >
          {pctText}
        </Animated.Text>
        <View style={[styles.labelBadge, !isActive && styles.labelBadgeInactive]}>
          <Text style={[styles.sceneLabel, !isActive && styles.labelInactive]}>
            {label}
          </Text>
        </View>
      </View>

      {/* Time range — bottom-right corner */}
      <View style={styles.timeRange}>
        <Text style={[styles.timeRangeText, !isActive && styles.labelInactive]}>
          {TIME_RANGES[sceneKey]}
        </Text>
      </View>
    </Animated.View>
  );
}

/* ── Main component ── */

export default function TimeOfDayCard({ data }: TimeOfDayCardProps) {
  const { colors } = useTheme();
  const screenW = Dimensions.get('window').width;
  const cardSize = Math.floor((screenW - 32 - 16 - CARD_GAP) / 2);

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Time of Day</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        On-time reliability by period · Last 30 days
      </Text>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <SceneCard sceneKey="morning" label="MORNING" stats={data.morning} index={0} size={cardSize} />
          <SceneCard sceneKey="afternoon" label="AFTERNOON" stats={data.afternoon} index={1} size={cardSize} />
        </View>
        <View style={styles.gridRow}>
          <SceneCard sceneKey="evening" label="EVENING" stats={data.evening} index={2} size={cardSize} />
          <SceneCard sceneKey="night" label="NIGHT" stats={data.night} index={3} size={cardSize} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  grid: {
    gap: CARD_GAP,
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    justifyContent: 'center',
  },
  sceneCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  sceneContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pctValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
  },
  pctInactive: {
    color: 'rgba(255,255,255,0.3)',
  },
  labelBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  labelBadgeInactive: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sceneLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 1.5,
  },
  labelInactive: {
    color: 'rgba(255,255,255,0.3)',
  },
  timeRange: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    zIndex: 3,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },
});
