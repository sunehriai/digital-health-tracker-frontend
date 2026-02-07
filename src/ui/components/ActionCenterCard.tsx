import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { formatMedName } from '../../domain/utils';
import type { RitualChip, DoseTimeSlot } from '../../domain/types';

// Amber theme colors for Tier 1 (Minor Glitch)
const amberColors = {
  primary: '#F59E0B',
  glow: 'rgba(245, 158, 11, 0.15)',
  border: 'rgba(245, 158, 11, 0.4)',
  bg: 'rgba(245, 158, 11, 0.08)',
};

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
  const [isLogging, setIsLogging] = useState(false);
  const [showNextDose, setShowNextDose] = useState(false);

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
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AlertTriangle color={amberColors.primary} size={20} strokeWidth={2.5} />
        <Text style={styles.headerText}>MINOR GLITCH DETECTED</Text>
      </View>

      {/* Large Fraction */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(300)}
        style={styles.fractionContainer}
      >
        <Text style={styles.fractionText}>
          {completedCount}/{totalCount}
        </Text>
        <Text style={styles.actionRequired}>ACTION REQUIRED</Text>
      </Animated.View>

      {/* Log Button */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <TouchableOpacity
          style={[styles.logButton, isLogging && styles.logButtonLoading]}
          onPress={handleLogMissedDose}
          activeOpacity={0.8}
          disabled={isLogging}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={styles.logButtonText}>
              LOG {formatMedName(missedRitual.name, 'card').toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Insight Text */}
      <Animated.Text
        entering={FadeInDown.delay(300).duration(300)}
        style={styles.insightText}
      >
        {insightText}
      </Animated.Text>

      {/* Next Dose Section */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(300)}
        style={styles.nextDoseSection}
      >
        <TouchableOpacity
          style={styles.nextDoseToggle}
          onPress={toggleNextDose}
          activeOpacity={0.7}
        >
          <Clock color={colors.textMuted} size={14} strokeWidth={2} />
          <Text style={styles.nextDoseLabel}>Next Dose</Text>
          {showNextDose ? (
            <ChevronUp color={colors.textMuted} size={14} />
          ) : (
            <ChevronDown color={colors.textMuted} size={14} />
          )}
        </TouchableOpacity>

        {showNextDose && tomorrowSlot && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.nextDoseDetails}
          >
            <Text style={styles.nextDoseTime}>
              {tomorrowSlot.timeDisplay} Tomorrow
            </Text>
            {tomorrowSlot.medications.map(({ medication, doseInfo }) => (
              <View key={medication.id} style={styles.nextDoseMed}>
                <Text style={styles.nextDoseMedName}>{formatMedName(medication.name, 'card')}</Text>
                <Text style={styles.nextDoseMedDose}>{doseInfo}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {showNextDose && !tomorrowSlot && (
          <Text style={styles.noUpcoming}>No upcoming doses scheduled</Text>
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
    borderColor: amberColors.border,
    backgroundColor: amberColors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    color: amberColors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  fractionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fractionText: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  actionRequired: {
    color: amberColors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  logButton: {
    backgroundColor: amberColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: amberColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logButtonLoading: {
    opacity: 0.7,
  },
  logButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextDoseSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextDoseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextDoseLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  nextDoseDetails: {
    marginTop: 12,
    gap: 8,
  },
  nextDoseTime: {
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  nextDoseMedName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  nextDoseMedDose: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  noUpcoming: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
