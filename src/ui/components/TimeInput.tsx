import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Clock, ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';

interface TimeInputProps {
  value: string; // Always stored as "HH:MM" (24-hour)
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

// Convert 24-hour to 12-hour format
const to12Hour = (time24: string): { hour: string; minute: string; period: string } => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  return {
    hour: hour12.toString().padStart(2, '0'),
    minute: (minutes || 0).toString().padStart(2, '0'),
    period,
  };
};

// Convert 12-hour to 24-hour format
const to24Hour = (hour: string, minute: string, period: string): string => {
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

export default function TimeInput({ value, onChange, placeholder = 'Select time', label }: TimeInputProps) {
  const { colors } = useTheme();
  const { prefs: { timeFormat } } = useAppPreferences();
  const is24h = timeFormat === '24h';

  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const { hour, minute, period } = to12Hour(value || '08:00');

  // For 24h mode, parse differently
  const parsed24 = (value || '08:00').split(':');
  const hour24 = (parsed24[0] || '08').padStart(2, '0');
  const minute24 = (parsed24[1] || '00').padStart(2, '0');

  const [selectedHour, setSelectedHour] = useState(is24h ? hour24 : hour);
  const [selectedMinute, setSelectedMinute] = useState(is24h ? minute24 : minute);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const displayValue = value ? formatTime(value, timeFormat) : '';

  const handleOpenPicker = () => {
    if (is24h) {
      const parts = (value || '08:00').split(':');
      setSelectedHour((parts[0] || '08').padStart(2, '0'));
      setSelectedMinute((parts[1] || '00').padStart(2, '0'));
    } else {
      const parsed = to12Hour(value || '08:00');
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
    setShowPicker(true);
  };

  const handleDone = () => {
    let time24: string;
    if (is24h) {
      time24 = `${selectedHour}:${selectedMinute}`;
    } else {
      time24 = to24Hour(selectedHour, selectedMinute, selectedPeriod);
    }
    onChange(time24);
    setShowPicker(false);
  };

  const handleStartEdit = () => {
    setEditValue(displayValue);
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    setIsEditing(false);
    if (is24h) {
      const match = editValue.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const h = Math.min(23, parseInt(match[1], 10));
        const m = Math.min(59, parseInt(match[2], 10));
        onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    } else {
      const match = editValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        const h = match[1].padStart(2, '0');
        const m = match[2];
        const p = (match[3] || period).toUpperCase();
        onChange(to24Hour(h, m, p));
      }
    }
  };

  const manualInputValue = is24h
    ? `${selectedHour}:${selectedMinute}`
    : `${selectedHour}:${selectedMinute} ${selectedPeriod}`;

  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity style={[styles.container, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]} onPress={handleOpenPicker}>
        <Clock color={colors.cyan} size={20} strokeWidth={2} />
        {isEditing ? (
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEndEdit}
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <TouchableOpacity style={styles.valueContainer} onLongPress={handleStartEdit}>
            <Text style={[styles.valueText, { color: colors.textPrimary }, !displayValue && { color: colors.textMuted }]}>
              {displayValue || placeholder}
            </Text>
          </TouchableOpacity>
        )}
        <ChevronDown color={colors.textMuted} size={20} />
      </TouchableOpacity>

      {/* Time Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Manual input field */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={[styles.manualInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.cyanGlow }]}
                value={manualInputValue}
                onChangeText={(text) => {
                  if (is24h) {
                    const match = text.match(/^(\d{0,2}):?(\d{0,2})$/);
                    if (match) {
                      if (match[1]) {
                        const h = Math.min(23, parseInt(match[1], 10));
                        setSelectedHour(h.toString().padStart(2, '0'));
                      }
                      if (match[2]) setSelectedMinute(match[2].padStart(2, '0').slice(-2));
                    }
                  } else {
                    const match = text.match(/^(\d{0,2}):?(\d{0,2})\s*(AM|PM)?$/i);
                    if (match) {
                      if (match[1]) setSelectedHour(match[1].padStart(2, '0').slice(-2));
                      if (match[2]) setSelectedMinute(match[2].padStart(2, '0').slice(-2));
                      if (match[3]) setSelectedPeriod(match[3].toUpperCase());
                    }
                  }
                }}
                placeholder={is24h ? 'HH:MM' : 'HH:MM AM/PM'}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.pickerColumns}>
              {/* Hour */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Hour</Text>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {(is24h ? HOURS_24 : HOURS_12).map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.option, { backgroundColor: colors.bgDark }, selectedHour === h && { backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyan }]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text style={[styles.optionText, { color: colors.textSecondary }, selectedHour === h && { color: colors.cyan }]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Min</Text>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.option, { backgroundColor: colors.bgDark }, selectedMinute === m && { backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyan }]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={[styles.optionText, { color: colors.textSecondary }, selectedMinute === m && { color: colors.cyan }]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Period (12h only) */}
              {!is24h && (
                <View style={styles.pickerColumn}>
                  <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Period</Text>
                  <View style={styles.periodOptions}>
                    {PERIODS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.option, { backgroundColor: colors.bgDark }, selectedPeriod === p && { backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyan }]}
                        onPress={() => setSelectedPeriod(p)}
                      >
                        <Text style={[styles.optionText, { color: colors.textSecondary }, selectedPeriod === p && { color: colors.cyan }]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.cyan }]} onPress={handleDone}>
              <Text style={[styles.doneBtnText, { color: colors.bg }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  container: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  valueContainer: {
    flex: 1,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  manualInputContainer: {
    marginBottom: 20,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  scrollView: {
    maxHeight: 200,
  },
  periodOptions: {
    gap: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 4,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
