import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useTheme } from '../theme/ThemeContext';
import { formatMedName } from '../../domain/utils';
import { logActionCenter } from '../../data/utils/notificationDebugLog';
import type { RitualChip, DoseTimeSlot } from '../../domain/types';

// Amber theme colors removed — now uses colors.warning from theme

interface ActionCenterCardProps {
  missedRitual: RitualChip;
  insightText: string;
  completedCount: number;
  totalCount: number;
  tomorrowSlot: DoseTimeSlot | null;
  onLogMissedDose: (medicationId: string) => Promise<boolean>;
}

export default function ActionCenterCard({
  missedRitual,
  insightText,
  completedCount,
  totalCount,
  tomorrowSlot,
  onLogMissedDose,
}: ActionCenterCardProps) {
  const { colors, isDark } = useTheme();
  const { prefs: { reducedMotion } } = useAppPreferences();
  const [isLogging, setIsLogging] = useState(false);
  const [showNextDose, setShowNextDose] = useState(false);

  // Log once on mount (useRef guards against React Strict Mode double-invoke)
  const logged = React.useRef(false);
  React.useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logActionCenter(completedCount, totalCount);
  }, []);

  const handleLogMissedDose = async () => {
    if (isLogging) return;

    setIsLogging(true);
    try {
      await onLogMissedDose(missedRitual.id);
    } finally {
      setIsLogging(false);
    }
  };

  const toggleNextDose = () => {
    setShowNextDose((prev) => !prev);
  };

  return (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(400)} style={[styles.container, { backgroundColor: isDark ? colors.overlayHeavy : colors.bgElevated, borderColor: isDark ? colors.cyanGlow : colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <AlertTriangle color={isDark ? '#FBBF24' : '#F59E0B'} size={24} strokeWidth={2.5} />
        <Text style={[styles.headerText, { color: isDark ? '#FBBF24' : '#F59E0B', fontSize: 14 }]}>MINOR GLITCH DETECTED</Text>
      </View>

      {/* Large Fraction */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(100).duration(300)}
        style={styles.fractionContainer}
      >
        <Text style={[styles.fractionText, { color: colors.textPrimary }]}>
          {completedCount}/{totalCount}
        </Text>
        <Text style={[styles.actionRequired, { color: colors.textPrimary }]}>ACTION REQUIRED</Text>
      </Animated.View>

      {/* Log Button */}
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200).duration(300)}>
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.cyan, shadowColor: colors.cyan }, isLogging && styles.logButtonLoading]}
          onPress={handleLogMissedDose}
          activeOpacity={0.8}
          disabled={isLogging}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={[styles.logButtonText, { color: colors.bg }]}>
              LOG {formatMedName(missedRitual.name, 'card').toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Insight Text */}
      <Animated.Text
        entering={reducedMotion ? undefined : FadeInDown.delay(300).duration(300)}
        style={[styles.insightText, { color: colors.textSecondary }]}
      >
        {insightText}
      </Animated.Text>

      {/* Next Dose Section */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(400).duration(300)}
        style={[styles.nextDoseSection, { borderTopColor: colors.borderSubtle }]}
      >
        <TouchableOpacity
          style={styles.nextDoseToggle}
          onPress={toggleNextDose}
          activeOpacity={0.7}
        >
          <Clock color={colors.textMuted} size={14} strokeWidth={2} />
          <Text style={[styles.nextDoseLabel, { color: colors.textMuted }]}>Next Dose</Text>
          {showNextDose ? (
            <ChevronUp color={colors.textMuted} size={14} />
          ) : (
            <ChevronDown color={colors.textMuted} size={14} />
          )}
        </TouchableOpacity>

        {showNextDose && tomorrowSlot && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(200)}
            style={styles.nextDoseDetails}
          >
            <Text style={[styles.nextDoseTime, { color: colors.textSecondary }]}>
              {tomorrowSlot.timeDisplay} Tomorrow
            </Text>
            {tomorrowSlot.medications.map(({ medication, doseInfo }) => (
              <View key={medication.id} style={[styles.nextDoseMed, { backgroundColor: colors.bgSubtle }]}>
                <Text style={[styles.nextDoseMedName, { color: colors.textPrimary }]}>{formatMedName(medication.name, 'card')}</Text>
                <Text style={[styles.nextDoseMedDose, { color: colors.textMuted }]}>{doseInfo}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {showNextDose && !tomorrowSlot && (
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
    marginBottom: 16,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  fractionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fractionText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  actionRequired: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  logButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logButtonLoading: {
    opacity: 0.7,
  },
  logButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextDoseSection: {
    marginTop: 16,
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
    fontSize: 13,
    fontWeight: '500',
  },
  nextDoseDetails: {
    marginTop: 12,
    gap: 8,
  },
  nextDoseTime: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextDoseMed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  nextDoseMedName: {
    fontSize: 13,
    fontWeight: '500',
  },
  nextDoseMedDose: {
    fontSize: 12,
    fontWeight: '500',
  },
  noUpcoming: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
