import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useTheme } from '../theme/ThemeContext';
import { formatMedName } from '../../domain/utils';
import { logVictoryCard } from '../../data/utils/notificationDebugLog';
import type { DoseTimeSlot } from '../../domain/types';

interface VictoryCardProps {
  points: number;
  insightText: string;
  tomorrowSlot: DoseTimeSlot | null;
  completedCount: number;
  totalCount: number;
  comebackBoostActive?: boolean;
  boostHoursRemaining?: number;
}

export default function VictoryCard({
  points,
  insightText,
  tomorrowSlot,
  completedCount,
  totalCount,
  comebackBoostActive = false,
  boostHoursRemaining = 0,
}: VictoryCardProps) {
  const { colors } = useTheme();
  const { prefs: { reducedMotion } } = useAppPreferences();
  const [showTomorrowDoses, setShowTomorrowDoses] = useState(false);

  // Log once on mount (useRef guards against React Strict Mode double-invoke)
  const logged = React.useRef(false);
  React.useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logVictoryCard(points, completedCount, totalCount);
  }, []);

  const toggleTomorrowDoses = () => {
    setShowTomorrowDoses((prev) => !prev);
  };

  return (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(400)} style={[styles.container, { borderColor: colors.cyanGlow, backgroundColor: colors.cyanDim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles color={colors.cyan} size={18} strokeWidth={2.5} />
        <Text style={[styles.headerText, { color: colors.cyan }]}>VITALITY SYNC COMPLETE</Text>
      </View>

      {/* Circular Glow Background with Badge and Points */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(100).duration(300)}
        style={styles.glowContainer}
      >
        {/* Outer glow circle */}
        <View style={[styles.outerGlow, { shadowColor: colors.cyan, backgroundColor: colors.bgDark, borderColor: colors.cyanGlow }]}>
          {/* Circular Badge with Zap Icon */}
          <View style={[styles.circularBadge, { borderColor: colors.cyan, backgroundColor: colors.bgDark }]}>
            <Zap color={colors.cyan} size={28} strokeWidth={2.5} fill={colors.cyan} />
          </View>

          {/* Points Display */}
          <Text style={[styles.pointsValue, { color: colors.textPrimary, textShadowColor: colors.cyan }]}>{points}</Text>
          <Text style={[styles.pointsLabel, { color: colors.cyan }]}>VITALITY</Text>
        </View>
      </Animated.View>

      {/* Doses Recorded */}
      <Animated.Text
        entering={reducedMotion ? undefined : FadeInDown.delay(300).duration(300)}
        style={[styles.dosesRecorded, { color: colors.textMuted }]}
      >
        {completedCount}/{totalCount} doses recorded
      </Animated.Text>

      {/* Comeback Boost Callout */}
      {comebackBoostActive && boostHoursRemaining > 0 && (
        <Animated.Text
          entering={reducedMotion ? undefined : FadeInDown.delay(350).duration(300)}
          style={[styles.boostCallout, { color: colors.warning }]}
        >
          Comeback boost active — today's XP was doubled! {boostHoursRemaining}h left.
        </Animated.Text>
      )}

      {/* Insight Text */}
      <Animated.Text
        entering={reducedMotion ? undefined : FadeInDown.delay(400).duration(300)}
        style={[styles.insightText, { color: colors.textSecondary }]}
      >
        {insightText}
      </Animated.Text>

      {/* Next Dose Section */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(500).duration(300)}
        style={[styles.nextDoseSection, { borderTopColor: colors.borderSubtle }]}
      >
        <TouchableOpacity
          style={styles.nextDoseToggle}
          onPress={toggleTomorrowDoses}
          activeOpacity={0.7}
        >
          <Clock color={colors.textMuted} size={14} strokeWidth={2} />
          <Text style={[styles.nextDoseLabel, { color: colors.textMuted }]}>Next Dose</Text>
          {showTomorrowDoses ? (
            <ChevronUp color={colors.textMuted} size={14} />
          ) : (
            <ChevronDown color={colors.textMuted} size={14} />
          )}
        </TouchableOpacity>

        {showTomorrowDoses && tomorrowSlot && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(200)}
            style={styles.tomorrowDetails}
          >
            <Text style={[styles.tomorrowTime, { color: colors.textSecondary }]}>
              {tomorrowSlot.timeDisplay} Tomorrow
            </Text>
            {tomorrowSlot.medications.map(({ medication, doseInfo }) => (
              <View key={medication.id} style={[styles.tomorrowMed, { backgroundColor: colors.bgSubtle }]}>
                <Text style={[styles.tomorrowMedName, { color: colors.textPrimary }]}>{formatMedName(medication.name, 'card')}</Text>
                <Text style={[styles.tomorrowMedDose, { color: colors.textMuted }]}>{doseInfo}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {showTomorrowDoses && !tomorrowSlot && (
          <Text style={[styles.noUpcoming, { color: colors.textMuted }]}>No upcoming doses scheduled</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  glowContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  outerGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  circularBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  dosesRecorded: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  boostCallout: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  nextDoseSection: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextDoseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextDoseLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tomorrowDetails: {
    marginTop: 12,
    gap: 8,
  },
  tomorrowTime: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tomorrowMed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  tomorrowMedName: {
    fontSize: 12,
    fontWeight: '500',
  },
  tomorrowMedDose: {
    fontSize: 11,
    fontWeight: '500',
  },
  noUpcoming: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
