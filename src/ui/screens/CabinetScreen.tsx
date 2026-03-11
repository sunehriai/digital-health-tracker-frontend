import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Platform, TextInput, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, Clock, Pause, Archive, Play, Search, X, CheckSquare, Square, ChevronLeft, AlertTriangle, Plus } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedications } from '../hooks/useMedications';
import { feedService } from '../../data/services/feedService';
import { medicationService } from '../../data/services/medicationService';
import { doseStatusCache } from '../../data/utils/doseStatusCache';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import type { Medication } from '../../domain/types';
import type { RootStackParamList } from '../navigation/types';
import { formatTime, getNextDoseInfoString, formatOccurrence } from '../../domain/utils';
import { useAppPreferences } from '../hooks/useAppPreferences';
import {
  INVENTORY_CONFIG,
  STOCK_THRESHOLDS,
  calculateStockPercentage,
  getStockAccentColor,
} from '../../domain/medicationConfig';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useAlert } from '../context/AlertContext';
import ScreenshotToast from '../components/ScreenshotToast';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Pulsing card wrapper for low-stock medications
function PulsingCard({ children, isLowStock, borderSubtle }: { children: React.ReactNode; isLowStock: boolean; borderSubtle: string }) {
  const pulseOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (isLowStock) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 0;
    }
  }, [isLowStock]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: isLowStock ? `rgba(251, 146, 60, ${pulseOpacity.value})` : borderSubtle,
    shadowColor: isLowStock ? '#FB923C' : 'transparent',
    shadowOpacity: isLowStock ? pulseOpacity.value * 0.5 : 0,
    shadowRadius: isLowStock ? 8 : 0,
    shadowOffset: { width: 0, height: 0 },
  }));

  return (
    <Animated.View style={[{ borderWidth: 1, borderRadius: 16, marginBottom: 12 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export default function CabinetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('Cabinet');
  const { showAlert } = useAlert();
  const { prefs: { timeFormat } } = useAppPreferences();
  const { colors, isDark, shadow } = useTheme();
  const {
    activeMedications,
    archivedMedications,
    loading,
    fetchMedications,
    pauseMedication,
    resumeMedication,
    archiveMedication,
    restoreMedication,
    deleteMedication,
  } = useMedications();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused' | 'low' | 'critical'>('all');
  const [takenTodayIds, setTakenTodayIds] = useState<Set<string>>(new Set());

  // Refill modal state
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);
  const [selectedMedForRefill, setSelectedMedForRefill] = useState<Medication | null>(null);

  // Filter medications based on search and filter
  const filteredActiveMedications = useMemo(() => {
    let filtered = activeMedications;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(med =>
        med.name.toLowerCase().includes(query) ||
        (med.strength && med.strength.toLowerCase().includes(query)) ||
        (med.brand_name && med.brand_name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(med => !med.is_paused);
        break;
      case 'paused':
        filtered = filtered.filter(med => med.is_paused);
        break;
      case 'low':
        filtered = filtered.filter(med => {
          const stockPct = calculateStockPercentage(med.current_stock, med.initial_stock);
          return stockPct < STOCK_THRESHOLDS.lowPercent;
        });
        break;
      case 'critical':
        filtered = filtered.filter(med => med.is_critical);
        break;
    }

    // Sort: Low Stock (≤5) → Critical → Active → Paused
    filtered = [...filtered].sort((a, b) => {
      // Low stock (≤5 doses) always at top - urgent refill needed
      const aIsLowStock = a.current_stock <= STOCK_THRESHOLDS.critical;
      const bIsLowStock = b.current_stock <= STOCK_THRESHOLDS.critical;
      if (aIsLowStock !== bIsLowStock) {
        return aIsLowStock ? -1 : 1;
      }

      // Then critical meds
      if (a.is_critical !== b.is_critical) {
        return a.is_critical ? -1 : 1;
      }

      // Then sort by paused status (paused at bottom)
      if (a.is_paused !== b.is_paused) {
        return a.is_paused ? 1 : -1;
      }

      // Within same category, sort by stock (lower first)
      return a.current_stock - b.current_stock;
    });

    return filtered;
  }, [activeMedications, searchQuery, activeFilter]);


  // Refresh medications and taken status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMedications();
      // Load taken IDs from persistent storage
      const loadTakenIds = async () => {
        const takenIds = await doseStatusCache.getTakenToday();
        setTakenTodayIds(takenIds);
      };
      loadTakenIds();
    }, [fetchMedications])
  );

  const handlePause = async (id: string) => {
    try { await pauseMedication(id); } catch (e: any) { showAlert({ title: 'Error', message: e.message, type: 'error' }); }
  };
  const handleResume = async (id: string) => {
    try { await resumeMedication(id); } catch (e: any) { showAlert({ title: 'Error', message: e.message, type: 'error' }); }
  };
  const handleArchive = async (id: string) => {
    try {
      // Find the medication to get its name
      const med = activeMedications.find(m => m.id === id);
      const medName = med?.name || 'Medication';

      // Archive any outstanding refill alerts for this medication
      try {
        const allFeedItems = await feedService.getAll();
        const refillAlerts = allFeedItems.filter(
          item => item.medication_id === id &&
                  item.type === 'refill_alert' &&
                  !item.is_archived
        );

        // Archive each refill alert
        for (const alert of refillAlerts) {
          await feedService.archive(alert.id);
        }
      } catch (feedError) {
        console.error('Failed to archive refill alerts:', feedError);
      }

      // Archive the medication
      await archiveMedication(id);

      // Create past activity entry
      try {
        await feedService.create({
          type: 'intake',
          priority: 'normal',
          title: `${medName} archived`,
          subtitle: 'Moved to history',
          medication_id: id,
        });
      } catch (activityError) {
        console.error('Failed to create activity log:', activityError);
      }

    } catch (e: any) { showAlert({ title: 'Error', message: e.message, type: 'error' }); }
  };

  // Open refill modal for a medication
  const openRefillModal = (med: Medication) => {
    setSelectedMedForRefill(med);
    setRefillAmount('');
    setRefillModalVisible(true);
  };

  // Confirm refill
  const handleConfirmRefill = async () => {
    if (!selectedMedForRefill) return;
    const amount = parseInt(refillAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showAlert({ title: 'Invalid Amount', message: 'Please enter a valid refill quantity.', type: 'warning' });
      return;
    }

    setRefillLoading(true);
    try {
      const refillLog = await medicationService.refill(selectedMedForRefill.id, amount);

      // Archive any existing refill alerts for this medication
      try {
        const allFeedItems = await feedService.getAll();
        const refillAlerts = allFeedItems.filter(
          item => item.medication_id === selectedMedForRefill.id &&
                  item.type === 'refill_alert' &&
                  !item.is_archived
        );
        for (const alert of refillAlerts) {
          await feedService.archive(alert.id);
        }
      } catch (feedError) {
        console.error('Failed to archive refill alerts:', feedError);
      }

      // Create activity log
      try {
        await feedService.create({
          type: 'intake',
          priority: 'normal',
          title: `${selectedMedForRefill.name} refilled`,
          subtitle: `Added ${amount} doses`,
          medication_id: selectedMedForRefill.id,
        });
      } catch (activityError) {
        console.error('Failed to create activity log:', activityError);
      }

      setRefillModalVisible(false);
      setSelectedMedForRefill(null);
      setRefillAmount('');
      fetchMedications(); // Refresh list to show updated stock
    } catch (e: any) {
      showAlert({ title: 'Refill Failed', message: e.message || 'Unable to log refill.', type: 'error' });
    } finally {
      setRefillLoading(false);
    }
  };

  const handleMedicationPress = (med: Medication) => {
    if (isSelectMode) {
      toggleSelection(med.id);
    } else {
      navigation.navigate('MedicationDetails', { medicationId: med.id });
    }
  };

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredActiveMedications.map(m => m.id)));
  };

  // Bulk action handlers
  const handleBulkPause = async () => {
    const pausableIds = Array.from(selectedIds).filter(id => {
      const med = activeMedications.find(m => m.id === id);
      return med && !med.is_paused;
    });

    if (pausableIds.length === 0) {
      showAlert({ title: 'No Action', message: 'No active medications selected to pause.', type: 'warning' });
      return;
    }

    try {
      for (const id of pausableIds) {
        await pauseMedication(id);
      }
      exitSelectMode();
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleBulkResume = async () => {
    const resumableIds = Array.from(selectedIds).filter(id => {
      const med = activeMedications.find(m => m.id === id);
      return med && med.is_paused;
    });

    if (resumableIds.length === 0) {
      showAlert({ title: 'No Action', message: 'No paused medications selected to resume.', type: 'warning' });
      return;
    }

    try {
      for (const id of resumableIds) {
        await resumeMedication(id);
      }
      exitSelectMode();
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleBulkArchive = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const doArchive = async () => {
      try {
        for (const id of selectedIds) {
          const med = activeMedications.find(m => m.id === id);
          const medName = med?.name || 'Medication';

          // Archive refill alerts
          try {
            const allFeedItems = await feedService.getAll();
            const refillAlerts = allFeedItems.filter(
              item => item.medication_id === id && item.type === 'refill_alert' && !item.is_archived
            );
            for (const alert of refillAlerts) {
              await feedService.archive(alert.id);
            }
          } catch (feedError) {
            console.error('Failed to archive refill alerts:', feedError);
          }

          await archiveMedication(id);

          try {
            await feedService.create({
              type: 'intake',
              priority: 'normal',
              title: `${medName} archived`,
              subtitle: 'Moved to history',
              medication_id: id,
            });
          } catch (activityError) {
            console.error('Failed to create activity log:', activityError);
          }
        }
        exitSelectMode();
      } catch (e: any) {
        showAlert({ title: 'Error', message: e.message, type: 'error' });
      }
    };

    showAlert({
      title: 'Archive Medications',
      message: `Archive ${count} medication${count > 1 ? 's' : ''}?`,
      type: 'destructive',
      confirmLabel: 'Archive',
      onConfirm: doArchive,
    });
  };

  // Swipeable card component using react-native-gesture-handler's Swipeable
  const SwipeableCard = ({ children, onPause, onArchive, isPaused, onResume }: {
    children: React.ReactNode;
    onPause?: () => void;
    onArchive?: () => void;
    isPaused?: boolean;
    onResume?: () => void;
  }) => {
    const swipeableRef = useRef<Swipeable>(null);

    const closeSwipeable = () => {
      swipeableRef.current?.close();
    };

    const handleAction = (action: () => void) => {
      closeSwipeable();
      setTimeout(action, 100);
    };

    // Skip swipe gestures in select mode
    if (isSelectMode) {
      return <>{children}</>;
    }

    const renderRightActions = () => (
      <View style={styles.swipeActions}>
        {isPaused ? (
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeActionResume]}
            onPress={() => onResume && handleAction(onResume)}
          >
            <Play color="#fff" size={20} strokeWidth={2.5} />
            <Text style={styles.swipeActionText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeActionPause]}
            onPress={() => onPause && handleAction(onPause)}
          >
            <Pause color="#fff" size={20} strokeWidth={2.5} />
            <Text style={styles.swipeActionText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeActionArchive]}
          onPress={() => onArchive && handleAction(onArchive)}
        >
          <Archive color="#fff" size={20} strokeWidth={2.5} />
          <Text style={styles.swipeActionText}>Archive</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        {children}
      </Swipeable>
    );
  };

  const renderActiveMed = (med: Medication) => {
    const stockPct = calculateStockPercentage(med.current_stock, med.initial_stock);
    const isLow = stockPct < STOCK_THRESHOLDS.veryLowPercent;
    const isVeryLowStock = med.current_stock <= STOCK_THRESHOLDS.critical; // For pulsing animation
    const accentColor = getStockAccentColor(stockPct);
    const isSelected = selectedIds.has(med.id);

    const cardContent = (
      <TouchableOpacity
        style={[
          styles.medCard,
          { backgroundColor: colors.bgSubtle, borderColor: 'rgba(45,212,191,0.2)' },
          med.is_paused && [styles.medCardPaused, { borderColor: colors.borderSubtle }],
          isSelectMode && isSelected && styles.medCardSelected,
        ]}
        onPress={() => handleMedicationPress(med)}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            setSelectedIds(new Set([med.id]));
          }
        }}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        {/* Header row with icon and name */}
        <View style={styles.medHeaderRow}>
          {isSelectMode && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => toggleSelection(med.id)}
            >
              {isSelected ? (
                <CheckSquare color="#2DD4BF" size={22} strokeWidth={2.5} />
              ) : (
                <Square color={colors.textMuted} size={22} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.medIcon}>
            <Pill color={med.is_paused ? colors.textMuted : "#2DD4BF"} size={24} strokeWidth={3} />
          </View>
          <View style={styles.medNameSection}>
            <View style={styles.medNameRow}>
              <Text style={[styles.medName, { color: colors.textPrimary }]} numberOfLines={1}>{med.name}</Text>
              {med.is_critical && (
                <View style={styles.criticalBadge}>
                  <AlertTriangle color="#FB7185" size={12} strokeWidth={3} />
                </View>
              )}
              {formatOccurrence(med) && (
                <View style={styles.occurrenceBadge}>
                  <Text style={styles.occurrenceText}>{formatOccurrence(med)}</Text>
                </View>
              )}
            </View>
            {med.strength && <Text style={[styles.medStrength, { color: colors.textMuted }]}>{med.strength}</Text>}
          </View>
          {/* Swipe hint */}
          {!isSelectMode && (
            <View style={styles.swipeHint}>
              <ChevronLeft color={colors.textMuted} size={14} strokeWidth={2} />
            </View>
          )}
        </View>

        {/* Slim stock bar */}
        <View style={styles.stockRow}>
          <View style={[styles.stockBarBg, { backgroundColor: colors.bgInput }]}>
            <View style={[styles.stockBarFill, { width: `${Math.min(stockPct, 100)}%`, backgroundColor: accentColor }]} />
          </View>
          <Text style={[styles.stockCount, { color: accentColor }]}>{INVENTORY_CONFIG.formatStockDisplay(med.current_stock, med.initial_stock, med.dose_unit)}</Text>
        </View>

        {/* Footer: Next dose or paused */}
        <View style={styles.footerRow}>
          {med.is_paused ? (
            <Text style={[styles.pausedText, { color: colors.textSecondary }]}>PAUSED</Text>
          ) : (
            <View style={styles.nextDoseRow}>
              <Clock color="#2DD4BF" size={14} strokeWidth={3} />
              <Text style={styles.nextDoseText}>{getNextDoseInfoString(med, takenTodayIds.has(med.id) ? new Set([0]) : new Set(), timeFormat)}</Text>
            </View>
          )}
          <View style={styles.footerActions}>
            {/* Log Refill button - only shows for low stock */}
            {isVeryLowStock && !isSelectMode && (
              <TouchableOpacity
                style={styles.refillBtn}
                onPress={(e) => { e.stopPropagation(); openRefillModal(med); }}
              >
                <Plus color="#FB923C" size={12} strokeWidth={3} />
                <Text style={styles.refillBtnText}>Refill</Text>
              </TouchableOpacity>
            )}
            {med.is_paused && !isSelectMode && (
              <TouchableOpacity style={styles.resumeBtn} onPress={(e) => { e.stopPropagation(); handleResume(med.id); }}>
                <Play color="#2DD4BF" size={12} strokeWidth={3} />
                <Text style={styles.resumeText}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <Animated.View key={med.id} entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} layout={Layout.springify()}>
        <PulsingCard isLowStock={isVeryLowStock} borderSubtle={colors.borderSubtle}>
          <SwipeableCard
            onPause={() => handlePause(med.id)}
            onResume={() => handleResume(med.id)}
            onArchive={() => handleArchive(med.id)}
            isPaused={med.is_paused}
          >
            {cardContent}
          </SwipeableCard>
        </PulsingCard>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, isSelectMode && styles.contentWithBottomBar]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
          {/* Header */}
          <View style={styles.headerRow}>
            {isSelectMode ? (
              <>
                <TouchableOpacity style={styles.cancelSelectBtn} onPress={exitSelectMode}>
                  <X color={colors.textSecondary} size={20} strokeWidth={2.5} />
                  <Text style={[styles.cancelSelectText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.selectedCount, { color: colors.textPrimary }]}>
                  {selectedIds.size} selected
                </Text>
                <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
                  <Text style={styles.selectAllText}>Select All</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Cabinet</Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage your medication regimen</Text>
                </View>
                <TouchableOpacity
                  style={styles.archiveIconBtn}
                  onPress={() => navigation.navigate('ArchivedRituals' as any)}
                >
                  <Archive color={colors.textMuted} size={22} strokeWidth={2} />
                </TouchableOpacity>
              </>
            )}
          </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.bgInput }]}>
            <Search color={colors.textMuted} size={18} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search medications..."
              placeholderTextColor={colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <X color={colors.textMuted} size={16} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        {!isSelectMode && (
          <View style={styles.filterChips}>
            {([
              { key: 'all', label: 'All' },
              { key: 'critical', label: 'Critical' },
              { key: 'active', label: 'Active' },
              { key: 'paused', label: 'Paused' },
              { key: 'low', label: 'Low Stock' },
            ] as const).map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.bgInput, borderColor: colors.borderSubtle },
                  activeFilter === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  activeFilter === filter.key && styles.filterChipTextActive,
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Med list */}
        <GestureHandlerRootView style={styles.medList}>
          {filteredActiveMedications.map(renderActiveMed)}
          {filteredActiveMedications.length === 0 && !loading && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery || activeFilter !== 'all'
                ? 'No medications match your search or filter.'
                : 'No active medications. Add one to get started.'}
            </Text>
          )}
        </GestureHandlerRootView>
      </ScrollView>

      {/* Bottom Action Bar for Select Mode */}
      {isSelectMode && selectedIds.size > 0 && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={[styles.bottomActionBar, { backgroundColor: colors.bgElevated, borderTopColor: colors.borderSubtle }]}
        >
          <TouchableOpacity style={styles.bottomAction} onPress={handleBulkPause}>
            <Pause color={colors.textMuted} size={20} strokeWidth={2.5} />
            <Text style={[styles.bottomActionText, { color: colors.textSecondary }]}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} onPress={handleBulkResume}>
            <Play color="#2DD4BF" size={20} strokeWidth={2.5} />
            <Text style={[styles.bottomActionText, { color: '#2DD4BF' }]}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} onPress={handleBulkArchive}>
            <Archive color="#FB7185" size={20} strokeWidth={2.5} />
            <Text style={[styles.bottomActionText, { color: '#FB7185' }]}>Archive</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Refill Modal */}
      <Modal
        visible={refillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefillModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log Refill</Text>
            {selectedMedForRefill && (
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {INVENTORY_CONFIG.formatRefillSubtitle(selectedMedForRefill.name, selectedMedForRefill.current_stock, selectedMedForRefill.dose_unit)}
              </Text>
            )}

            {/* Quick-add chips */}
            <View style={styles.quickAddRow}>
              {[30, 60, 90].map((qty) => (
                <TouchableOpacity
                  key={qty}
                  style={[
                    styles.quickAddChip,
                    refillAmount === String(qty) && styles.quickAddChipActive,
                  ]}
                  onPress={() => setRefillAmount(String(qty))}
                >
                  <Text
                    style={[
                      styles.quickAddText,
                      refillAmount === String(qty) && styles.quickAddTextActive,
                    ]}
                  >
                    +{qty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom input */}
            <View style={styles.customInputRow}>
              <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>Or enter custom:</Text>
              <TextInput
                style={[styles.customInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]}
                value={refillAmount}
                onChangeText={setRefillAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Preview */}
            {selectedMedForRefill && refillAmount && !isNaN(parseInt(refillAmount, 10)) && (() => {
              const newTotal = selectedMedForRefill.current_stock + parseInt(refillAmount, 10);
              const newInitial = Math.max(selectedMedForRefill.initial_stock, newTotal);
              return (
                <View style={styles.previewRow}>
                  <Text style={styles.previewText}>
                    New Total: {INVENTORY_CONFIG.formatStockDisplay(newTotal, newInitial, selectedMedForRefill.dose_unit)}
                  </Text>
                </View>
              );
            })()}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.borderSubtle }]}
                onPress={() => setRefillModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!refillAmount || refillLoading) && styles.modalConfirmBtnDisabled,
                ]}
                onPress={handleConfirmRefill}
                disabled={!refillAmount || refillLoading}
              >
                <Text style={[styles.modalConfirmText, { color: colors.bgDark }]}>
                  {refillLoading ? 'Saving...' : 'Confirm Refill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  contentWithBottomBar: { paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Archive icon button
  archiveIconBtn: {
    padding: 8,
  },

  // Select mode header
  cancelSelectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  cancelSelectText: { fontSize: 15, fontWeight: '600' },
  selectedCount: { fontSize: 17, fontWeight: '700' },
  selectAllBtn: {
    paddingVertical: 8, paddingHorizontal: 12,
  },
  selectAllText: { color: '#2DD4BF', fontSize: 15, fontWeight: '600' },

  // Checkbox
  checkboxContainer: { marginRight: 8 },

  // Search
  searchContainer: { marginBottom: 16 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  clearSearchBtn: {
    padding: 4,
  },

  // Filter Chips
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    borderColor: '#2DD4BF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#2DD4BF',
  },

  medList: { gap: 12 },
  // Swipeable card
  swipeableContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeAction: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeActionPause: {
    backgroundColor: '#475569',
  },
  swipeActionResume: {
    backgroundColor: '#059669',
  },
  swipeActionArchive: {
    backgroundColor: '#DC2626',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Med card
  medCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  medCardPaused: {
    opacity: 0.6,
  },
  medCardSelected: {
    borderColor: '#2DD4BF',
    backgroundColor: 'rgba(45,212,191,0.08)',
  },

  // Header row
  medHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45,212,191,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(45,212,191,0.3)',
  },
  medNameSection: { flex: 1 },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  criticalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 113, 133, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  occurrenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
  },
  occurrenceText: {
    color: '#2DD4BF',
    fontSize: 9,
    fontWeight: '600',
  },
  medStrength: {
    fontSize: 12,
    marginTop: 1,
  },
  swipeHint: {
    opacity: 0.5,
  },

  // Stock row
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  stockBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: 6,
    borderRadius: 3,
  },
  stockCount: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 55,
    textAlign: 'right',
  },

  // Footer row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextDoseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextDoseText: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '600',
  },
  pausedText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(45,212,191,0.15)',
  },
  resumeText: {
    color: '#2DD4BF',
    fontSize: 11,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  refillBtnText: {
    color: '#FB923C',
    fontSize: 11,
    fontWeight: '700',
  },

  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 40 },

  // Bottom action bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  bottomAction: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bottomActionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Refill Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  quickAddChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
  },
  quickAddChipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.25)',
    borderColor: '#2DD4BF',
  },
  quickAddText: {
    color: '#2DD4BF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickAddTextActive: {
    color: '#2DD4BF',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  customInputLabel: {
    fontSize: 14,
  },
  customInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
  },
  previewRow: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  previewText: {
    color: '#2DD4BF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2DD4BF',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
