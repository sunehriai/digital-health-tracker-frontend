import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Pill, Flame, Check, ShieldCheck, AlertCircle, Bell, Clock, Zap } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFeed } from '../hooks/useFeed';
import { useGamification } from '../hooks/useGamification';
import { gamificationService } from '../../data/services/gamificationService';
import { colors } from '../theme/colors';
import type { VitalityFeedItem, XpEvent } from '../../domain/types';

// Format relative time like "2H AGO", "10H AGO", "2D AGO"
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'JUST NOW';
  if (diffMins < 60) return `${diffMins}M AGO`;
  if (diffHours < 24) return `${diffHours}H AGO`;
  if (diffDays < 7) return `${diffDays}D AGO`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function getAlertIcon(type: string, isActive: boolean) {
  const size = 20;
  const sw = 2.5;
  const color = isActive ? colors.cyan : '#8E9196';

  switch (type) {
    case 'refill_alert':
      return <Pill color={color} size={size} strokeWidth={sw} />;
    case 'streak':
      return <Clock color={color} size={size} strokeWidth={sw} />;
    case 'intake':
      return <Check color={color} size={size} strokeWidth={sw} />;
    case 'safety':
      return <ShieldCheck color={color} size={size} strokeWidth={sw} />;
    case 'sync':
      return <AlertCircle color={color} size={size} strokeWidth={sw} />;
    default:
      return <Bell color={color} size={size} strokeWidth={sw} />;
  }
}

interface AlertCardProps {
  item: VitalityFeedItem;
  isActive: boolean;
  onLogRefill?: () => void;
  onDismiss: () => void;
}

function AlertCard({ item, isActive, onLogRefill, onDismiss }: AlertCardProps) {
  return (
    <View style={[styles.alertCard, isActive && styles.alertCardActive]}>
      <View style={styles.alertRow}>
        <View style={[styles.alertIcon, isActive ? styles.alertIconActive : styles.alertIconPast]}>
          {getAlertIcon(item.type, isActive)}
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, !isActive && styles.alertTitlePast]}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.alertSubtitle}>{item.subtitle}</Text>
          )}
          <Text style={styles.alertTime}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        {isActive && item.type === 'refill_alert' && onLogRefill && (
          <TouchableOpacity style={styles.logRefillBtn} onPress={onLogRefill}>
            <Text style={styles.logRefillText}>Log Refill</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Human-readable labels for XP event types
const EVENT_LABELS: Record<string, string> = {
  first_medication: 'First Medication Added',
  new_medication: 'New Medication Added',
  profile_complete: 'Profile Completed',
  health_profile_complete: 'Health Profile Completed',
  daily_perfect: 'Perfect Day',
  daily_imperfect: 'Imperfect Day',
  daily_missed: 'Missed Day',
  dose_revert: 'Dose Reverted',
  waiver_used: 'Waiver Badge Used',
  milestone_dedicated: 'Milestone: Dedicated',
  milestone_committed: 'Milestone: Committed',
  milestone_devoted: 'Milestone: Devoted',
};

export default function AlertsScreen() {
  const navigation = useNavigation();
  const { feedItems, fetchFeed, archiveFeedItem } = useFeed();
  const { totalXp, currentTier, tierName } = useGamification();

  // XP History log
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const [xpLoading, setXpLoading] = useState(true);

  const fetchXpHistory = useCallback(async () => {
    setXpLoading(true);
    try {
      const data = await gamificationService.getHistory(0, 50);
      setXpEvents(data.events);
    } catch {
      setXpEvents([]);
    } finally {
      setXpLoading(false);
    }
  }, []);

  // Refresh feed + XP history when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFeed();
      fetchXpHistory();
    }, [fetchFeed, fetchXpHistory])
  );

  const activeAlerts = feedItems.filter((a) => a.priority === 'high' && !a.is_archived);

  // Past activity: show last 7 user actions (sorted by most recent)
  const pastActivity = feedItems
    .filter((a) => a.priority === 'normal' && !a.is_archived)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 7);

  const handleLogRefill = (item: VitalityFeedItem) => {
    // Navigate to medication details with alert ID so it can be dismissed after refill
    if (item.medication_id) {
      (navigation as any).navigate('MedicationDetails', {
        medicationId: item.medication_id,
        alertId: item.id
      });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await archiveFeedItem(id);
    } catch (e: any) {
      const msg = e?.message || 'Failed to dismiss alert';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Vitality Feed</Text>
            <Text style={styles.subtitle}>Real-time system intelligence</Text>
          </View>
          <TouchableOpacity style={styles.previewBtn}>
            <Text style={styles.previewText}>PREVIEW</Text>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {feedItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Bell color={colors.cyan} size={32} strokeWidth={2} />
            </View>
            <Text style={styles.emptyText}>System Nominal. All rituals on track.</Text>
          </View>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleActive}>ACTIVE ALERTS</Text>
            <View style={styles.alertList}>
              {activeAlerts.map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)}>
                  <AlertCard
                    item={item}
                    isActive={true}
                    onLogRefill={() => handleLogRefill(item)}
                    onDismiss={() => handleDismiss(item.id)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Past Activity */}
        {pastActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitlePast}>PAST ACTIVITY</Text>
            <View style={styles.alertList}>
              {pastActivity.map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)}>
                  <AlertCard
                    item={item}
                    isActive={false}
                    onDismiss={() => handleDismiss(item.id)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* XP Activity Log (Temporary Debug) */}
        <View style={styles.section}>
          <View style={styles.xpLogHeader}>
            <View style={styles.xpLogTitleRow}>
              <Zap color="#FFD700" size={16} strokeWidth={2.5} fill="#FFD700" />
              <Text style={styles.xpLogTitle}>XP ACTIVITY LOG</Text>
            </View>
            <Text style={styles.xpLogSummary}>{totalXp} XP — {tierName} (Tier {currentTier})</Text>
          </View>

          {xpLoading ? (
            <ActivityIndicator color={colors.cyan} style={{ paddingVertical: 20 }} />
          ) : xpEvents.length === 0 ? (
            <View style={styles.xpLogEmpty}>
              <Text style={styles.xpLogEmptyText}>No XP events yet. Complete actions to earn XP.</Text>
            </View>
          ) : (
            <View style={styles.xpTable}>
              {/* Table Header */}
              <View style={styles.xpTableRow}>
                <Text style={[styles.xpTableCell, styles.xpTableHeader, { flex: 2 }]}>ACTION</Text>
                <Text style={[styles.xpTableCell, styles.xpTableHeader, { flex: 1, textAlign: 'right' }]}>POINTS</Text>
                <Text style={[styles.xpTableCell, styles.xpTableHeader, { flex: 1.2, textAlign: 'right' }]}>TIME</Text>
              </View>
              {/* Table Rows */}
              {xpEvents.map((event) => (
                <View key={event.id} style={styles.xpTableRow}>
                  <Text style={[styles.xpTableCell, styles.xpTableAction, { flex: 2 }]} numberOfLines={1}>
                    {EVENT_LABELS[event.event_type] ?? event.event_type}
                  </Text>
                  <Text style={[styles.xpTableCell, { flex: 1, textAlign: 'right' }, event.points >= 0 ? styles.xpTablePositive : styles.xpTableNegative]}>
                    {event.points >= 0 ? '+' : ''}{event.points}
                  </Text>
                  <Text style={[styles.xpTableCell, styles.xpTableTime, { flex: 1.2, textAlign: 'right' }]}>
                    {formatRelativeTime(event.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4,
  },
  previewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  previewText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitleActive: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitlePast: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  alertList: {
    gap: 12,
  },

  // Alert Cards
  alertCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  alertCardActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.4)',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIconActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  alertIconPast: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertTitlePast: {
    color: '#CBD5E1',
  },
  alertSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 4,
  },
  alertTime: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // Log Refill Button
  logRefillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  logRefillText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },

  // XP Activity Log
  xpLogHeader: {
    marginBottom: 12,
  },
  xpLogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  xpLogTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  xpLogSummary: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 22,
  },
  xpLogEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  xpLogEmptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  xpTable: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  xpTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  xpTableCell: {
    fontSize: 13,
  },
  xpTableHeader: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  xpTableAction: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  xpTablePositive: {
    color: '#4ADE80',
    fontWeight: '700',
  },
  xpTableNegative: {
    color: '#EF4444',
    fontWeight: '700',
  },
  xpTableTime: {
    color: '#64748B',
    fontSize: 11,
  },
});
