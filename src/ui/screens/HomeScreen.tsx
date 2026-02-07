import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroSection from '../components/HeroSection';
import VictoryCard from '../components/VictoryCard';
import VictorySyncAnimation from '../components/VictorySyncAnimation';
import ActionCenterCard from '../components/ActionCenterCard';
import RitualsCarousel, { RitualsCarouselRef } from '../components/RitualsCarousel';
import TipOfTheDay from '../components/TipOfTheDay';
import VitalityScoreCard from '../components/VitalityScoreCard';
import { useMedications } from '../hooks/useMedications';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { doseStatusCache } from '../../data/utils/doseStatusCache';
import { medicationEvents } from '../../data/utils/medicationEvents';
import type { RootStackParamList } from '../navigation/types';
import type { Medication, DoseTimeSlot, RevertableDose } from '../../domain/types';
import {
  getNextDoseTime,
  formatTimeAMPM,
  formatDoseDate,
  formatMealRelation,
  isToday,
  getTomorrowsDoses,
  buildTodaysRituals,
  getRitualStats,
  isAllRitualsComplete,
  calculateDailyPoints,
  getVictoryInsight,
  shouldShowActionCenter,
  getOldestMissedRitual,
  getActionCenterInsight,
  getCriticalMissedRitual,
  getActiveDose,
  canRevertDose,
} from '../../domain/utils';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeMedications, fetchMedications, logDoseBatch, logDose, revertDose } = useMedications();

  // Debug: Track renders
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log('[HomeScreen] ===== RENDER #' + renderCount.current + ' =====');

  // Track medications that have been taken today (to skip them in next dose calculation)
  // Using array instead of Set for more reliable React state updates
  const [takenTodayArray, setTakenTodayArray] = useState<string[]>([]);

  // Derived Set for O(1) lookups (recalculates when array changes)
  const takenTodayIds = useMemo(() => new Set(takenTodayArray), [takenTodayArray]);

  // Version counter to force memo recalculation (backup mechanism)
  const [stateVersion, setStateVersion] = useState(0);

  // Lock to prevent race conditions during dose logging
  const [isLoggingDose, setIsLoggingDose] = useState(false);

  // Victory animation state
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [wasInActionCenter, setWasInActionCenter] = useState(false);

  // In-memory tracking for revertable doses (not persisted - cleared on app restart)
  const [revertableDoses, setRevertableDoses] = useState<RevertableDose[]>([]);

  // Load persisted taken IDs and revertable doses on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      await doseStatusCache.cleanupOldData();
      const persisted = await doseStatusCache.getTakenToday();
      if (persisted.size > 0) {
        const persistedArray = Array.from(persisted);
        console.log('[HomeScreen] Loaded persisted takenToday:', persistedArray);
        setTakenTodayArray(persistedArray);
        setStateVersion((v) => v + 1);
      }
      // Load and cleanup expired revertable doses
      const revertables = await doseStatusCache.cleanupExpiredRevertables();
      if (revertables.length > 0) {
        console.log('[HomeScreen] Loaded persisted revertableDoses:', revertables.map(r => r.chipId));
        setRevertableDoses(revertables);
      }
    };
    loadPersistedState();
  }, []);

  // Subscribe to medication events for cross-screen sync
  useEffect(() => {
    const unsubPaused = medicationEvents.on('medication_paused', () => {
      fetchMedications();
    });
    const unsubResumed = medicationEvents.on('medication_resumed', () => {
      fetchMedications();
    });
    const unsubDeleted = medicationEvents.on('medication_deleted', () => {
      fetchMedications();
    });
    const unsubArchived = medicationEvents.on('medication_archived', () => {
      fetchMedications();
    });
    const unsubRestored = medicationEvents.on('medication_restored', () => {
      fetchMedications();
    });
    return () => {
      unsubPaused();
      unsubResumed();
      unsubDeleted();
      unsubArchived();
      unsubRestored();
    };
  }, [fetchMedications]);

  // Refresh medications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMedications();
      // Reload persisted state on focus
      const loadPersisted = async () => {
        await doseStatusCache.cleanupOldData();
        const persisted = await doseStatusCache.getTakenToday();
        const persistedArray = Array.from(persisted);
        console.log('[HomeScreen] Focus: Loaded persisted takenToday:', persistedArray);
        setTakenTodayArray(persistedArray);
        setStateVersion((v) => v + 1);
        // Reload revertable doses (and cleanup expired ones)
        const revertables = await doseStatusCache.cleanupExpiredRevertables();
        console.log('[HomeScreen] Focus: Loaded revertableDoses:', revertables.map(r => r.chipId));
        setRevertableDoses(revertables);
      };
      loadPersisted();
      // Reset animation state on focus if not in victory
      // This handles cases like day change or adding new medications
      setShowVictoryAnimation(false);
      setWasInActionCenter(false);
    }, [fetchMedications])
  );

  // Build today's rituals FIRST (needed for nextDoseSlot calculation)
  // IMPORTANT: This must recalculate when takenTodayArray changes
  const todaysRituals = useMemo(() => {
    console.log('[Rituals] ===== RECALCULATING (v' + stateVersion + ') =====');
    console.log('[Rituals] takenTodayArray:', takenTodayArray);
    const result = buildTodaysRituals(activeMedications, takenTodayIds);
    console.log('[Rituals] result:', result.map(r => `${r.name}: ${r.status}`));
    return result;
  }, [activeMedications, takenTodayArray, takenTodayIds, stateVersion]);

  // Check if all today's rituals are complete
  const allRitualsComplete = useMemo(() => {
    if (todaysRituals.length === 0) return false;
    return todaysRituals.every((r) => r.status === 'completed');
  }, [todaysRituals]);

  // Calculate the next dose time slot using hand-off logic (1h 15min rule)
  // IMPORTANT: Uses getActiveDose() which respects:
  // - 60 minutes expiry after scheduled time
  // - 15 minutes hand-off before next dose
  const nextDoseSlot = useMemo((): DoseTimeSlot | null => {
    console.log('[NextDose] ===== RECALCULATING (v' + stateVersion + ') =====');
    console.log('[NextDose] takenTodayArray:', takenTodayArray);
    console.log('[NextDose] todaysRituals:', todaysRituals.map(r => `${r.name}: ${r.status}`));

    // Step 1: Use getActiveDose() to find the current active dose from today's rituals
    // This respects the 1h 15min hand-off logic
    const activeDose = getActiveDose(todaysRituals, takenTodayIds);
    console.log('[NextDose] activeDose from getActiveDose():', activeDose?.name || 'null');

    if (activeDose) {
      // Found an active dose for today - group all medications at this same time
      const activeTime = activeDose.scheduledTime;
      const medsAtSameTime = todaysRituals
        .filter((r) => {
          // Same time AND not expired (not taken, not past 60 min expiry)
          const isSameTime = r.scheduledTime.getTime() === activeTime.getTime();
          const isTaken = takenTodayIds.has(r.id); // Use chipId for taken check
          return isSameTime && !isTaken;
        })
        .map((r) => {
          // Use medicationId to find the actual medication
          const med = activeMedications.find((m) => m.id === r.medicationId);
          return med;
        })
        .filter((m): m is Medication => m !== undefined);

      if (medsAtSameTime.length > 0) {
        const slot: DoseTimeSlot = {
          doseTime: activeTime,
          timeDisplay: formatTimeAMPM(activeTime),
          dateDisplay: formatDoseDate(activeTime),
          isTodayDose: true,
          medications: medsAtSameTime.map((med) => ({
            medication: med,
            mealInfo: formatMealRelation(med.meal_relation),
            doseInfo: med.dose_size > 1 ? `${med.dose_size} doses` : '1 dose',
          })),
        };

        console.log('[NextDose] Active slot from today:', {
          medsCount: slot.medications.length,
          medNames: slot.medications.map((m) => m.medication.name),
          time: slot.timeDisplay,
        });

        return slot;
      }
    }

    // Step 2: No active dose today - check for tomorrow's doses
    console.log('[NextDose] No active dose today, checking tomorrow...');

    // Find medications with doses for tomorrow (or later)
    const futureDoseMap = new Map<string, { doseTime: Date; medications: Medication[] }>();

    for (const med of activeMedications) {
      // Always skip today (all today's doses are either taken or expired)
      // Pass all possible dose indices (0, 1, 2) to skip all today's doses
      const doseTime = getNextDoseTime(med, new Set([0, 1, 2]));

      if (doseTime && !isToday(doseTime)) {
        const timeKey = doseTime.toISOString();
        if (futureDoseMap.has(timeKey)) {
          futureDoseMap.get(timeKey)!.medications.push(med);
        } else {
          futureDoseMap.set(timeKey, { doseTime, medications: [med] });
        }
      }
    }

    if (futureDoseMap.size === 0) {
      console.log('[NextDose] No future doses found');
      return null;
    }

    // Find the earliest future dose
    let earliest: { doseTime: Date; medications: Medication[] } | null = null;
    for (const entry of futureDoseMap.values()) {
      if (!earliest || entry.doseTime < earliest.doseTime) {
        earliest = entry;
      }
    }

    if (!earliest) return null;

    const slot: DoseTimeSlot = {
      doseTime: earliest.doseTime,
      timeDisplay: formatTimeAMPM(earliest.doseTime),
      dateDisplay: formatDoseDate(earliest.doseTime),
      isTodayDose: false,
      medications: earliest.medications.map((med) => ({
        medication: med,
        mealInfo: formatMealRelation(med.meal_relation),
        doseInfo: med.dose_size > 1 ? `${med.dose_size} doses` : '1 dose',
      })),
    };

    console.log('[NextDose] Future slot:', {
      medsCount: slot.medications.length,
      medNames: slot.medications.map((m) => m.medication.name),
      time: slot.timeDisplay,
      date: slot.dateDisplay,
    });

    return slot;
  }, [activeMedications, todaysRituals, takenTodayArray, takenTodayIds, stateVersion]);

  const ritualStats = useMemo(() => getRitualStats(todaysRituals), [todaysRituals]);

  const isVictory = useMemo(
    () => isAllRitualsComplete(ritualStats),
    [ritualStats]
  );

  // Calculate tomorrow's dose slot (memoized for performance)
  const tomorrowSlot = useMemo(
    () => getTomorrowsDoses(activeMedications),
    [activeMedications]
  );

  // Victory card data
  const victoryPoints = useMemo(
    () => calculateDailyPoints(ritualStats),
    [ritualStats]
  );

  const victoryInsight = useMemo(() => getVictoryInsight(), []);

  // Action Center (Recovery State) calculations
  const showActionCenter = useMemo(
    () => shouldShowActionCenter(todaysRituals, ritualStats),
    [todaysRituals, ritualStats]
  );

  const oldestMissedRitual = useMemo(
    () => (showActionCenter ? getOldestMissedRitual(todaysRituals) : null),
    [showActionCenter, todaysRituals]
  );

  const actionCenterInsight = useMemo(
    () => (oldestMissedRitual ? getActionCenterInsight(oldestMissedRitual.name) : ''),
    [oldestMissedRitual]
  );

  // Track ActionCenter state for animation transition detection
  useEffect(() => {
    if (showActionCenter) {
      setWasInActionCenter(true);
    }
  }, [showActionCenter]);

  // Detect transition from ActionCenter to Victory and trigger animation
  useEffect(() => {
    if (wasInActionCenter && isVictory && !showActionCenter) {
      console.log('[VictoryAnimation] Triggering sync animation');
      setShowVictoryAnimation(true);
      setWasInActionCenter(false);
    }
  }, [wasInActionCenter, isVictory, showActionCenter]);

  // Handler for when victory animation completes
  const handleVictoryAnimationComplete = useCallback(() => {
    console.log('[VictoryAnimation] Animation complete');
    // Animation stays showing - no need to hide it since it ends in victory state
  }, []);

  // Critical Miss detection (for medications with isCritical: true)
  const criticalMissedRitual = useMemo(() => {
    const result = getCriticalMissedRitual(todaysRituals, activeMedications);
    console.log('[CriticalMiss] Recalculating:', {
      ritualsCount: todaysRituals.length,
      missedRituals: todaysRituals.filter(r => r.status === 'missed').map(r => r.name),
      result: result?.name || null,
    });
    return result;
  }, [todaysRituals, activeMedications]); // todaysRituals already depends on takenTodayKey

  // Ref for RitualsCarousel to scroll to critical miss
  const ritualsCarouselRef = useRef<RitualsCarouselRef>(null);

  // Handler to scroll to critical miss in carousel
  const handleCriticalMissPress = useCallback(() => {
    if (criticalMissedRitual) {
      ritualsCarouselRef.current?.scrollToRitual(criticalMissedRitual.id);
    }
  }, [criticalMissedRitual]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleTakeNow = useCallback(async (): Promise<{
    isFutureDose: boolean;
    dateDisplay?: string;
    partialFailure?: boolean;
    failedCount?: number;
  }> => {
    // Prevent concurrent dose logging
    if (isLoggingDose) {
      console.log('[TakeNow] Already logging, ignoring');
      return { isFutureDose: false };
    }

    console.log('[TakeNow] Button clicked, nextDoseSlot:', nextDoseSlot?.medications.length, 'medications');
    if (nextDoseSlot) {
      // Check if dose is for a future day (not today)
      if (!nextDoseSlot.isTodayDose) {
        console.log('[TakeNow] Dose is for future date:', nextDoseSlot.dateDisplay);
        return { isFutureDose: true, dateDisplay: nextDoseSlot.dateDisplay };
      }

      setIsLoggingDose(true);
      try {
        const doses = nextDoseSlot.medications.map(({ medication }) => ({
          medicationId: medication.id,
          data: {
            scheduled_at: nextDoseSlot.doseTime.toISOString(),
            status: 'taken' as const,
          },
        }));

        console.log('[TakeNow] Logging batch dose for:', doses.length, 'medications');
        const { success, failed } = await logDoseBatch(doses);

        console.log('[TakeNow] Batch result:', success.length, 'success,', failed.length, 'failed');

        // Mark successful doses as taken today using chipIds (supports multi-dose)
        // Find the corresponding ritual chips at this time slot
        const slotTime = nextDoseSlot.doseTime.getTime();
        const successRituals = todaysRituals.filter((r) => {
          // Same scheduled time and medication not in failed list
          const isSameTime = r.scheduledTime.getTime() === slotTime;
          const medicationFailed = failed.includes(r.medicationId);
          return isSameTime && !medicationFailed;
        });
        const successChipIds = successRituals.map((r) => r.id);

        if (successChipIds.length > 0) {
          // Update state using array for reliable React updates
          setTakenTodayArray((prev) => {
            const newArray = [...prev];
            successChipIds.forEach((chipId) => {
              if (!newArray.includes(chipId)) {
                newArray.push(chipId);
              }
            });
            console.log('[TakeNow] Updated takenTodayArray with chipIds:', newArray);
            return newArray;
          });
          // Increment version to force memo recalculation
          setStateVersion((v) => v + 1);
          // Persist to storage (use chipIds for multi-dose support)
          await doseStatusCache.markTaken(successChipIds);

          // Track these doses for potential revert (30-minute window) - non-blocking
          try {
            const takenAt = new Date();
            const newRevertables: RevertableDose[] = [];
            for (const ritual of successRituals) {
              const matchingDose = success.find((d) => d.medication_id === ritual.medicationId);
              if (matchingDose?.id) {
                const entry: RevertableDose = {
                  chipId: ritual.id,
                  doseId: matchingDose.id,
                  medicationId: ritual.medicationId,
                  takenAt,
                };
                newRevertables.push(entry);
                await doseStatusCache.addRevertableDose(entry);
              }
            }
            if (newRevertables.length > 0) {
              setRevertableDoses((prev) => [...prev, ...newRevertables]);
              console.log('[TakeNow] Added to revertableDoses:', newRevertables.length, 'doses');
            }
          } catch (revertTrackError) {
            console.warn('[TakeNow] Failed to track for revert:', revertTrackError);
          }
        }

        if (failed.length > 0) {
          return { isFutureDose: false, partialFailure: true, failedCount: failed.length };
        }

        return { isFutureDose: false };
      } catch (error) {
        console.error('[TakeNow] Failed to log dose batch:', error);
      } finally {
        setIsLoggingDose(false);
      }
    } else {
      console.log('[TakeNow] No nextDoseSlot available');
    }
    return { isFutureDose: false };
  }, [nextDoseSlot, todaysRituals, logDoseBatch, isLoggingDose]);

  // Handler for taking a single dose from RitualsCarousel
  // chipId: unique identifier for this dose (e.g., "med.id" or "med.id_dose_1")
  // medicationId: the actual medication ID for API calls
  const handleTakeSingleDose = useCallback(
    async (chipId: string, medicationId: string): Promise<boolean> => {
      // Prevent concurrent dose logging
      if (isLoggingDose) {
        console.log('[TakeSingleDose] Already logging, ignoring');
        return false;
      }

      const medication = activeMedications.find((m) => m.id === medicationId);
      if (!medication) {
        console.log('[TakeSingleDose] Medication not found:', medicationId);
        return false;
      }

      // Find the ritual chip to get the correct scheduled time
      const ritual = todaysRituals.find((r) => r.id === chipId);

      setIsLoggingDose(true);
      try {
        // Use the scheduled time from the ritual chip (handles multi-dose correctly)
        const scheduledTime = ritual?.scheduledTime || new Date();
        if (!ritual) {
          scheduledTime.setHours(
            parseInt(medication.time_of_day.split(':')[0], 10),
            parseInt(medication.time_of_day.split(':')[1], 10),
            0,
            0
          );
        }

        console.log('[TakeSingleDose] Logging dose for:', medication.name, 'chipId:', chipId, 'is_critical:', medication.is_critical);
        const doseLog = await logDose(medicationId, {
          scheduled_at: scheduledTime.toISOString(),
          status: 'taken',
        });

        // Update state using chipId (supports multi-dose tracking)
        console.log('[TakeSingleDose] Updating takenTodayArray with chipId:', chipId);
        setTakenTodayArray((prev) => {
          if (prev.includes(chipId)) {
            console.log('[TakeSingleDose] Already in array, no change');
            return prev;
          }
          const newArray = [...prev, chipId];
          console.log('[TakeSingleDose] New takenTodayArray:', newArray);
          return newArray;
        });
        // Increment version to force memo recalculation
        setStateVersion((v) => {
          console.log('[TakeSingleDose] Incrementing stateVersion to:', v + 1);
          return v + 1;
        });

        // Persist to storage (use chipId for multi-dose support)
        await doseStatusCache.markTaken([chipId]);

        // Track this dose for potential revert (30-minute window) - non-blocking
        try {
          if (doseLog?.id) {
            const revertableEntry: RevertableDose = {
              chipId,
              doseId: doseLog.id,
              medicationId,
              takenAt: new Date(),
            };
            setRevertableDoses((prev) => [...prev, revertableEntry]);
            await doseStatusCache.addRevertableDose(revertableEntry);
            console.log('[TakeSingleDose] Added to revertableDoses:', chipId);
          }
        } catch (revertTrackError) {
          console.warn('[TakeSingleDose] Failed to track for revert:', revertTrackError);
        }

        return true;
      } catch (error) {
        console.error('[TakeSingleDose] Failed to log dose:', error);
        return false;
      } finally {
        setIsLoggingDose(false);
      }
    },
    [activeMedications, todaysRituals, logDose, isLoggingDose]
  );

  // Handler for logging missed doses from ActionCenterCard
  // Uses chipId from the missed ritual for proper multi-dose tracking
  const handleLogMissedDose = useCallback(
    async (chipId: string): Promise<boolean> => {
      // Prevent concurrent dose logging
      if (isLoggingDose) {
        console.log('[LogMissedDose] Already logging, ignoring');
        return false;
      }

      // Find the missed ritual by chipId
      const missedRitual = todaysRituals.find((r) => r.id === chipId);
      if (!missedRitual) {
        console.log('[LogMissedDose] Ritual not found for chipId:', chipId);
        return false;
      }

      const medicationId = missedRitual.medicationId;
      const medication = activeMedications.find((m) => m.id === medicationId);
      if (!medication) {
        console.log('[LogMissedDose] Medication not found:', medicationId);
        return false;
      }

      setIsLoggingDose(true);
      try {
        // Use the scheduled time from the ritual (handles multi-dose correctly)
        const scheduledTime = missedRitual.scheduledTime;

        console.log('[LogMissedDose] Logging missed dose for:', medication.name, 'chipId:', chipId);
        // Note: Backend accepts 'taken' - late status can be inferred from timestamp comparison
        await logDose(medicationId, {
          scheduled_at: scheduledTime.toISOString(),
          status: 'taken',
        });

        // Update state using chipId (supports multi-dose tracking)
        setTakenTodayArray((prev) => {
          if (prev.includes(chipId)) {
            return prev;
          }
          const newArray = [...prev, chipId];
          console.log('[LogMissedDose] Updated takenTodayArray:', newArray);
          return newArray;
        });
        // Increment version to force memo recalculation
        setStateVersion((v) => v + 1);

        // Persist to storage (use chipId for multi-dose support)
        await doseStatusCache.markTaken([chipId]);

        return true;
      } catch (error) {
        console.error('[LogMissedDose] Failed to log dose:', error);
        return false;
      } finally {
        setIsLoggingDose(false);
      }
    },
    [activeMedications, todaysRituals, logDose, isLoggingDose]
  );

  // Check if a chip can be reverted (within 30-minute window)
  const canRevertChip = useCallback(
    (chipId: string): boolean => {
      const revertable = revertableDoses.find((r) => r.chipId === chipId);
      if (!revertable) return false;
      return canRevertDose(revertable.takenAt);
    },
    [revertableDoses]
  );

  // Handler for reverting (undoing) a dose
  const handleRevertDose = useCallback(
    async (chipId: string): Promise<{ success: boolean; error?: string }> => {
      // Prevent concurrent operations
      if (isLoggingDose) {
        console.log('[RevertDose] Already processing, ignoring');
        return { success: false, error: 'Please wait' };
      }

      // Find the revertable dose entry
      const revertable = revertableDoses.find((r) => r.chipId === chipId);
      if (!revertable) {
        console.log('[RevertDose] No revertable entry for chipId:', chipId);
        return { success: false, error: 'Cannot undo this dose' };
      }

      // Check if still within revert window
      if (!canRevertDose(revertable.takenAt)) {
        console.log('[RevertDose] Window expired for chipId:', chipId);
        // Remove expired entry from tracking (memory + storage)
        setRevertableDoses((prev) => prev.filter((r) => r.chipId !== chipId));
        await doseStatusCache.removeRevertableDose(chipId);
        return { success: false, error: 'Undo window expired (30 minutes)' };
      }

      // Find medication for dose size
      const medication = activeMedications.find((m) => m.id === revertable.medicationId);
      const doseSize = medication?.dose_size || 1;

      setIsLoggingDose(true);
      try {
        console.log('[RevertDose] Reverting dose:', chipId, 'doseId:', revertable.doseId);
        const result = await revertDose(revertable.medicationId, revertable.doseId, doseSize);

        if (result.success) {
          // Remove from revertable tracking (memory + storage)
          setRevertableDoses((prev) => prev.filter((r) => r.chipId !== chipId));
          await doseStatusCache.removeRevertableDose(chipId);

          // Update takenTodayArray to remove this chip
          setTakenTodayArray((prev) => prev.filter((id) => id !== chipId));
          setStateVersion((v) => v + 1);

          // Update cache to reflect the revert
          await doseStatusCache.markReverted(chipId);

          console.log('[RevertDose] Successfully reverted chipId:', chipId);
          return { success: true };
        } else {
          console.log('[RevertDose] Failed:', result.error);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('[RevertDose] Error:', error);
        return { success: false, error: 'Unable to undo dose' };
      } finally {
        setIsLoggingDose(false);
      }
    },
    [revertableDoses, activeMedications, revertDose, isLoggingDose]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Vision</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {/* Bento layout */}
        <View style={styles.grid}>
          {showActionCenter && oldestMissedRitual ? (
            <ActionCenterCard
              missedRitual={oldestMissedRitual}
              insightText={actionCenterInsight}
              completedCount={ritualStats.completed}
              totalCount={ritualStats.total}
              tomorrowSlot={tomorrowSlot}
              onLogMissedDose={handleLogMissedDose}
            />
          ) : isVictory ? (
            showVictoryAnimation ? (
              <VictorySyncAnimation
                isTriggered={true}
                points={victoryPoints}
                insightText={victoryInsight}
                tomorrowSlot={tomorrowSlot}
                completedCount={ritualStats.completed}
                totalCount={ritualStats.total}
                onAnimationComplete={handleVictoryAnimationComplete}
              />
            ) : (
              <VictoryCard
                points={victoryPoints}
                insightText={victoryInsight}
                tomorrowSlot={tomorrowSlot}
                completedCount={ritualStats.completed}
                totalCount={ritualStats.total}
              />
            )
          ) : (
            <HeroSection
              medications={nextDoseSlot?.medications.map(({ medication, mealInfo, doseInfo }) => ({
                id: medication.id,
                name: medication.name,
                mealInfo,
                doseInfo,
                doseSize: medication.dose_size,
              }))}
              scheduledTime={nextDoseSlot?.timeDisplay || '--'}
              dateDisplay={nextDoseSlot?.dateDisplay}
              isTodayDose={nextDoseSlot?.isTodayDose ?? true}
              hasNextDose={!!nextDoseSlot}
              onTakeNow={handleTakeNow}
              disabled={isLoggingDose}
              criticalMissedRitual={criticalMissedRitual}
              onCriticalMissPress={handleCriticalMissPress}
            />
          )}
          {/* Hide rituals carousel when all rituals are complete - show vitality score instead */}
          {!allRitualsComplete && (
            <RitualsCarousel
              ref={ritualsCarouselRef}
              rituals={todaysRituals}
              onTakeDose={handleTakeSingleDose}
              onRevertDose={handleRevertDose}
              canRevertChip={canRevertChip}
              disabled={isLoggingDose}
            />
          )}
          {allRitualsComplete && <VitalityScoreCard />}
          <TipOfTheDay />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddMedication')}
      >
        <Plus color={colors.bg} size={24} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  date: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  grid: { gap: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
