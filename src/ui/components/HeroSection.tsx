import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Clock, CheckCircle2, Plus, Utensils, ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useGamification } from '../hooks/useGamification';
import GlowRing from './GlowRing';
import { haptics } from '../../data/utils/haptics';
import { formatMedName } from '../../domain/utils';
import type { RootStackParamList } from '../navigation/types';
import type { RitualChip } from '../../domain/types';

interface MedicationSlotItem {
  id: string;
  name: string;
  mealInfo: string | null;
  doseInfo: string;
  doseSize: number;
}

interface HeroSectionProps {
  medications?: MedicationSlotItem[];
  scheduledTime: string;
  dateDisplay?: string;
  isTodayDose?: boolean;
  hasNextDose?: boolean;
  onTakeNow?: () => Promise<{
    isFutureDose: boolean;
    dateDisplay?: string;
    partialFailure?: boolean;
    failedCount?: number;
  }>;
  disabled?: boolean;
  criticalMissedRitual?: RitualChip | null;
  onCriticalMissPress?: () => void;
}

export default function HeroSection({
  medications,
  scheduledTime,
  dateDisplay,
  isTodayDose = true,
  hasNextDose = true,
  onTakeNow,
  disabled = false,
  criticalMissedRitual,
  onCriticalMissPress,
}: HeroSectionProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const { streakDays } = useGamification();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFutureMessage, setShowFutureMessage] = useState(false);
  const [futureDate, setFutureDate] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const [partialFailureMessage, setPartialFailureMessage] = useState<string | null>(null);


  const medCount = medications?.length ?? 0;
  const isMultipleMeds = medCount > 1;
  const firstMed = medications?.[0];
  const displayName = isMultipleMeds
    ? `${medCount} Medications`
    : (firstMed ? formatMedName(firstMed.name, 'hero') : 'No medications scheduled');
  const displayMealInfo = !isMultipleMeds ? firstMed?.mealInfo : null;
  const totalDoses = medications?.reduce((sum, m) => sum + m.doseSize, 0) ?? 0;
  const displayDoseInfo = totalDoses > 1 ? `${totalDoses} doses` : '1 dose';

  const handleTakeNow = useCallback(async () => {
    console.log('[HeroSection] Take Now clicked');

    // For future doses, button is disabled - this shouldn't be called
    if (!isTodayDose) {
      console.log('[HeroSection] Button disabled for future dose');
      return;
    }

    // Call onTakeNow to log doses
    const result = await onTakeNow?.();

    if (result?.isFutureDose) {
      // Show message that dose is for a future date (shouldn't happen with disabled button)
      console.log('[HeroSection] Future dose detected:', result.dateDisplay);
      haptics.warning();
      setFutureDate(result.dateDisplay || 'a future date');
      setShowFutureMessage(true);
      setTimeout(() => {
        setShowFutureMessage(false);
      }, 2500);
      return;
    }

    if (result?.partialFailure) {
      // Some doses failed
      haptics.warning();
      setPartialFailureMessage(`${result.failedCount} dose(s) failed to log`);
      setTimeout(() => {
        setPartialFailureMessage(null);
      }, 3000);
    }

    // Show success (even for partial success)
    haptics.success();
    setShowSuccess(true);
    setExpanded(false);
    console.log('[HeroSection] onTakeNow completed');
    // Show success for a moment then hide
    setTimeout(() => {
      setShowSuccess(false);
      console.log('[HeroSection] Success state cleared');
    }, 1500);
  }, [onTakeNow, isTodayDose]);

  // No medications scheduled - show empty state
  if (!hasNextDose) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.cardEmpty, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSubtle }]}>
          <View style={styles.labelRow}>
            <Clock color={colors.textMuted} size={18} strokeWidth={2.5} />
            <Text style={[styles.labelText, { color: colors.cyan }, { color: colors.textMuted }]}>NEXT DOSE</Text>
          </View>

          <View style={styles.centerContent}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No upcoming doses</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add a medication to get started</Text>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.cyan }]}
            onPress={() => navigation.navigate('AddMedication')}
            activeOpacity={0.8}
          >
            <Plus color={colors.bg} size={16} strokeWidth={2.5} />
            <Text style={[styles.addButtonText, { color: colors.bg }]}>ADD MEDICATION</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: colors.cyanGlow, backgroundColor: colors.bgSubtle }]}>
        {/* Critical Miss Badge - Always visible when there's a critical miss */}
        {criticalMissedRitual && (
          <TouchableOpacity
            style={styles.criticalMissBadgeContainer}
            onPress={() => {
              haptics.warning();
              onCriticalMissPress?.();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.criticalMissBadge, {
              backgroundColor: isDark ? colors.error : '#FFF',
              borderColor: isDark ? colors.error : 'rgba(239, 68, 68, 0.4)',
              borderWidth: isDark ? 0 : 1,
              shadowColor: isDark ? colors.error : undefined,
              shadowOffset: isDark ? { width: 0, height: 2 } : undefined,
              shadowOpacity: isDark ? 0.5 : 0,
              shadowRadius: isDark ? 6 : 0,
              elevation: isDark ? 6 : 0,
            }]}>
              <AlertTriangle color={isDark ? '#FFF' : '#EF4444'} size={12} strokeWidth={2.5} />
              <Text style={[styles.criticalMissText, { color: isDark ? '#FFF' : '#EF4444' }]}>CRITICAL MISS</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Label with date */}
        <View style={styles.labelRow}>
          <Clock color={colors.cyan} size={18} strokeWidth={2.5} />
          <Text style={[styles.labelText, { color: colors.cyan }]}>NEXT DOSE</Text>
          {dateDisplay && (
            <View style={[styles.dateBadge, { backgroundColor: colors.cyanDim }, !isTodayDose && { backgroundColor: `${colors.warning}26` }]}>
              <Text style={[styles.dateText, { color: colors.cyan }, !isTodayDose && { color: colors.warning }]}>
                {dateDisplay}
              </Text>
            </View>
          )}
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          {/* Medication name with expand toggle for multiple meds */}
          {isMultipleMeds ? (
            <Pressable style={styles.medNameRow} onPress={() => setExpanded(!expanded)}>
              <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
              {expanded ? (
                <ChevronUp color={colors.textMuted} size={18} strokeWidth={2.5} />
              ) : (
                <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.5} />
              )}
            </Pressable>
          ) : (
            <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
          )}

          {/* Expanded list of medications */}
          {isMultipleMeds && expanded && (
            <View style={[styles.medicationList, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)' }]}>
              {medications?.map((med) => (
                <View key={med.id} style={styles.medicationListItem}>
                  <Text style={[styles.medicationListName, { color: colors.textPrimary }]}>{formatMedName(med.name, 'hero')}</Text>
                  <Text style={[styles.medicationListDose, { color: colors.textMuted }]}>{med.doseInfo}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Time and dose on same line */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.cyan }]}>{scheduledTime}</Text>
            {displayDoseInfo && <Text style={[styles.doseText, { color: colors.textMuted }]}>• {displayDoseInfo}</Text>}
          </View>

          {/* Meal timing (only for single medication) */}
          {displayMealInfo && (
            <View style={[styles.mealBadge, { backgroundColor: colors.cyanDim }]}>
              <Utensils color={colors.cyan} size={10} strokeWidth={2.5} />
              <Text style={[styles.mealText, { color: colors.cyan }]}>{displayMealInfo}</Text>
            </View>
          )}
        </View>

        {/* Partial failure warning */}
        {partialFailureMessage && (
          <View style={styles.warningBanner}>
            <AlertCircle color={colors.warning} size={14} strokeWidth={2.5} />
            <Text style={[styles.warningText, { color: colors.warning }]}>{partialFailureMessage}</Text>
          </View>
        )}

        {/* Button */}
        {showFutureMessage ? (
          <View style={[styles.futureButton, { backgroundColor: `${colors.warning}26`, borderColor: colors.warning }]}>
            <Clock color={colors.warning} size={18} strokeWidth={2.5} />
            <Text style={[styles.futureText, { color: colors.warning }]}>Scheduled for {futureDate}</Text>
          </View>
        ) : showSuccess ? (
          <View style={[styles.successButton, { backgroundColor: colors.cyanDim, borderColor: colors.cyan }]}>
            <CheckCircle2 color={colors.cyan} size={18} strokeWidth={2.5} />
            <Text style={[styles.successText, { color: colors.cyan }]}>Taken</Text>
          </View>
        ) : !isTodayDose ? (
          <View style={[styles.takeButtonDisabled, { backgroundColor: colors.bgSubtle }]}>
            <Text style={[styles.takeButtonTextDisabled, { color: colors.textMuted }]}>
              AVAILABLE {dateDisplay?.toUpperCase() || 'LATER'}
            </Text>
          </View>
        ) : disabled ? (
          <View style={[styles.takeButton, styles.takeButtonLoading, { backgroundColor: colors.cyan, shadowColor: colors.cyan }]}>
            <Text style={[styles.takeButtonText, styles.takeButtonTextLoading, { color: colors.bg }]}>LOGGING...</Text>
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            <AnimatedPressable style={[styles.takeButton, { backgroundColor: colors.cyan, shadowColor: colors.cyan }]} onPress={handleTakeNow} activeOpacity={0.8}>
              <Text style={[styles.takeButtonText, { color: colors.bg }]}>
                {isMultipleMeds ? `TAKE ALL ${medCount}` : 'TAKE NOW'}
              </Text>
            </AnimatedPressable>
            <GlowRing
              streakDays={streakDays}
              color={colors.cyanGlow}
              size={58}
              strokeWidth={2}
              enabled={hasNextDose && isTodayDose && !showSuccess}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  // Critical Miss Badge
  criticalMissBadgeContainer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -60,
    zIndex: 10,
  },
  criticalMissBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  criticalMissText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardEmpty: {
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dateBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeFuture: {
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateTextFuture: {
  },
  centerContent: { flex: 1, justifyContent: 'center', marginVertical: 8 },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  medicationList: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  medicationListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationListName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  medicationListDose: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  doseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mealText: {
    fontSize: 11,
    fontWeight: '600',
  },
  takeButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  takeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  takeButtonLoading: {
    opacity: 0.7,
  },
  takeButtonTextLoading: {
    opacity: 0.8,
  },
  successButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
  },
  futureButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  futureText: {
    fontSize: 12,
    fontWeight: '700',
  },
  takeButtonDisabled: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  takeButtonTextDisabled: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Empty state styles
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
