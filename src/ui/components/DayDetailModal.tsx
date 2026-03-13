import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Clock, X, Minus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { CalendarDoseRecord } from '../../domain/types';

interface DayDetailModalProps {
  visible: boolean;
  date: string | null; // ISO date string
  doses: CalendarDoseRecord[];
  onClose: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAY_NAMES[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  return `${dayName}, ${month} ${d.getDate()}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function StatusBadge({ status, takenAt, colors }: { status: string; takenAt: string | null; colors: any }) {
  switch (status) {
    case 'taken':
      return (
        <View style={styles.badgeRow}>
          <Check size={14} color={colors.success} />
          <Text style={[styles.badgeText, { color: colors.success }]}>On time</Text>
        </View>
      );
    case 'taken_late':
      return (
        <View style={styles.badgeRow}>
          <Clock size={14} color={colors.warning} />
          <Text style={[styles.badgeText, { color: colors.warning }]}>
            Taken late{takenAt ? ` (${formatTime(takenAt)})` : ''}
          </Text>
        </View>
      );
    case 'missed':
      return (
        <View style={styles.badgeRow}>
          <Minus size={14} color={colors.textMuted} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>Missed</Text>
        </View>
      );
    case 'pending':
      return (
        <View style={styles.badgeRow}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>Pending</Text>
        </View>
      );
    default:
      return null;
  }
}

export default function DayDetailModal({
  visible,
  date,
  doses,
  onClose,
}: DayDetailModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.bgElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {date ? formatDateHeader(date) : ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Dose list */}
          {doses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No doses scheduled
            </Text>
          ) : (
            <ScrollView style={styles.doseList} showsVerticalScrollIndicator={false}>
              {doses.map((dose, i) => (
                <View
                  key={`${dose.medication_id}-${i}`}
                  style={[styles.doseRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.doseInfo}>
                    <Text style={[styles.medName, { color: colors.textPrimary }]}>
                      {dose.medication_name}
                    </Text>
                    <Text style={[styles.scheduleText, { color: colors.textSecondary }]}>
                      Scheduled {formatTime(dose.scheduled_at)}
                    </Text>
                  </View>
                  <StatusBadge status={dose.status} takenAt={dose.taken_at} colors={colors} />
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  doseList: {
    flexGrow: 0,
  },
  doseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doseInfo: {
    flex: 1,
    marginRight: 12,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleText: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
