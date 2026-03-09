import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, RotateCcw, Trash2, Search, X, ChevronLeft, CheckSquare, Square, AlertTriangle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedications } from '../hooks/useMedications';
import { feedService } from '../../data/services/feedService';
import { colors } from '../theme/colors';
import type { Medication } from '../../domain/types';
import { useAlert } from '../context/AlertContext';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ArchivedRitualsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    archivedMedications,
    loading,
    fetchMedications,
    restoreMedication,
    deleteMedication,
  } = useMedications();
  const { showAlert } = useAlert();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter archived medications based on search
  const filteredMedications = useMemo(() => {
    if (!searchQuery.trim()) return archivedMedications;

    const query = searchQuery.toLowerCase().trim();
    return archivedMedications.filter(med =>
      med.name.toLowerCase().includes(query) ||
      (med.strength && med.strength.toLowerCase().includes(query)) ||
      (med.brand_name && med.brand_name.toLowerCase().includes(query))
    );
  }, [archivedMedications, searchQuery]);

  // Refresh medications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMedications();
    }, [fetchMedications])
  );

  const handleRestore = async (id: string) => {
    try {
      const med = archivedMedications.find(m => m.id === id);
      const medName = med?.name || 'Medication';

      await restoreMedication(id);

      try {
        await feedService.create({
          type: 'intake',
          priority: 'normal',
          title: `${medName} restored`,
          subtitle: 'Moved back to active',
          medication_id: id,
        });
      } catch (activityError) {
        console.error('Failed to create activity log:', activityError);
      }
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    }
  };

  const handleDelete = (med: Medication) => {
    const doDelete = async () => {
      try {
        await deleteMedication(med.id);
        const successMsg = `${med.name} has been permanently deleted.`;
        showAlert({ title: 'Deleted', message: successMsg, type: 'success' });
      } catch (e: any) {
        const errorMsg = e?.message || 'Failed to delete medication';
        showAlert({ title: 'Error', message: errorMsg, type: 'error' });
      }
    };

    showAlert({
      title: 'Delete Medication',
      message: `Permanently delete "${med.name}"?\n\nThis action cannot be undone.`,
      type: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: doDelete,
    });
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
    setSelectedIds(new Set(filteredMedications.map(m => m.id)));
  };

  // Bulk action handlers
  const handleBulkRestore = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    try {
      for (const id of selectedIds) {
        const med = archivedMedications.find(m => m.id === id);
        const medName = med?.name || 'Medication';

        await restoreMedication(id);

        try {
          await feedService.create({
            type: 'intake',
            priority: 'normal',
            title: `${medName} restored`,
            subtitle: 'Moved back to active',
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

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const doDelete = async () => {
      try {
        for (const id of selectedIds) {
          await deleteMedication(id);
        }
        exitSelectMode();
      } catch (e: any) {
        showAlert({ title: 'Error', message: e.message, type: 'error' });
      }
    };

    showAlert({
      title: 'Delete Medications',
      message: `Permanently delete ${count} medication${count > 1 ? 's' : ''}?\n\nThis action cannot be undone.`,
      type: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: doDelete,
    });
  };

  // Swipeable card component using react-native-gesture-handler's Swipeable
  const SwipeableCard = ({ children, onRestore, onDelete }: {
    children: React.ReactNode;
    onRestore?: () => void;
    onDelete?: () => void;
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
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeActionRestore]}
          onPress={() => onRestore && handleAction(onRestore)}
        >
          <RotateCcw color="#fff" size={20} strokeWidth={2.5} />
          <Text style={styles.swipeActionText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeActionDelete]}
          onPress={() => onDelete && handleAction(onDelete)}
        >
          <Trash2 color="#fff" size={20} strokeWidth={2.5} />
          <Text style={styles.swipeActionText}>Delete</Text>
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

  const renderMedication = (med: Medication) => {
    const isSelected = selectedIds.has(med.id);

    const cardContent = (
      <TouchableOpacity
        style={[
          styles.medCard,
          isSelectMode && isSelected && styles.medCardSelected,
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleSelection(med.id);
          } else {
            navigation.navigate('MedicationDetails', { medicationId: med.id, isArchived: true });
          }
        }}
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
                <Square color="#64748B" size={22} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.medIcon}>
            <Pill color="#64748B" size={24} strokeWidth={3} />
          </View>
          <View style={styles.medNameSection}>
            <View style={styles.medNameRow}>
              <Text style={styles.medName} numberOfLines={1}>{med.name}</Text>
              {med.is_critical && (
                <View style={styles.criticalBadge}>
                  <AlertTriangle color="#FB7185" size={12} strokeWidth={3} />
                </View>
              )}
            </View>
            {med.strength && <Text style={styles.medStrength}>{med.strength}</Text>}
          </View>
          {/* Swipe hint */}
          {!isSelectMode && (
            <View style={styles.swipeHint}>
              <ChevronLeft color="#475569" size={14} strokeWidth={2} />
            </View>
          )}
        </View>

        {/* Archived date */}
        <View style={styles.footerRow}>
          {med.archived_at && (
            <Text style={styles.archivedDate}>
              Archived {new Date(med.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );

    return (
      <Animated.View key={med.id} entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} layout={Layout.springify()}>
        <SwipeableCard
          onRestore={() => handleRestore(med.id)}
          onDelete={() => handleDelete(med)}
        >
          {cardContent}
        </SwipeableCard>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
                <X color="#94A3B8" size={20} strokeWidth={2.5} />
                <Text style={styles.cancelSelectText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>
                {selectedIds.size} selected
              </Text>
              <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ChevronLeft color="#94A3B8" size={24} strokeWidth={2} />
              </TouchableOpacity>
              <View style={styles.titleSection}>
                <Text style={styles.title}>History</Text>
                <Text style={styles.subtitle}>{archivedMedications.length} archived</Text>
              </View>
              <View style={{ width: 44 }} />
            </>
          )}
        </View>

        {/* Search Bar */}
        {!isSelectMode && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search color="#64748B" size={18} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search archived..."
                placeholderTextColor="#64748B"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <X color="#64748B" size={16} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Medication list */}
        <GestureHandlerRootView style={styles.medList}>
          {filteredMedications.map(renderMedication)}
          {filteredMedications.length === 0 && !loading && (
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No archived medications match your search.'
                : 'No archived medications.'}
            </Text>
          )}
        </GestureHandlerRootView>
      </ScrollView>

      {/* Bottom Action Bar for Select Mode */}
      {isSelectMode && selectedIds.size > 0 && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={styles.bottomActionBar}
        >
          <TouchableOpacity style={styles.bottomAction} onPress={handleBulkRestore}>
            <RotateCcw color="#2DD4BF" size={20} strokeWidth={2.5} />
            <Text style={[styles.bottomActionText, { color: '#2DD4BF' }]}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} onPress={handleBulkDelete}>
            <Trash2 color="#FB7185" size={20} strokeWidth={2.5} />
            <Text style={[styles.bottomActionText, { color: '#FB7185' }]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  contentWithBottomBar: { paddingBottom: 100 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: { flex: 1, alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },

  // Select mode header
  cancelSelectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  cancelSelectText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  selectedCount: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  selectAllBtn: {
    paddingVertical: 8, paddingHorizontal: 12,
  },
  selectAllText: { color: '#2DD4BF', fontSize: 15, fontWeight: '600' },

  // Search
  searchContainer: { marginBottom: 16 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
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

  // Checkbox
  checkboxContainer: { marginRight: 8 },

  // Med list
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
  swipeActionRestore: {
    backgroundColor: '#059669',
  },
  swipeActionDelete: {
    backgroundColor: '#DC2626',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Med card - matching CabinetScreen
  medCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  medNameSection: { flex: 1 },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medName: {
    color: '#94A3B8',
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
  medStrength: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  swipeHint: {
    opacity: 0.5,
  },

  // Footer row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  archivedDate: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingVertical: 40 },

  // Bottom action bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  bottomAction: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  bottomActionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
