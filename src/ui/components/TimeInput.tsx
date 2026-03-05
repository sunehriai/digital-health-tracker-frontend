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
import { colors } from '../theme/colors';

interface TimeInputProps {
  value: string; // Format: "HH:MM" (24-hour) or "HH:MM AM/PM" (12-hour display)
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
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
  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const { hour, minute, period } = to12Hour(value || '08:00');
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const displayValue = value ? `${hour}:${minute} ${period}` : '';

  const handleOpenPicker = () => {
    const parsed = to12Hour(value || '08:00');
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
    setShowPicker(true);
  };

  const handleDone = () => {
    const time24 = to24Hour(selectedHour, selectedMinute, selectedPeriod);
    onChange(time24);
    setShowPicker(false);
  };

  const handleStartEdit = () => {
    setEditValue(displayValue);
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    setIsEditing(false);
    // Parse the edited value
    const match = editValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      const p = (match[3] || period).toUpperCase();
      const time24 = to24Hour(h, m, p);
      onChange(time24);
    }
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.container} onPress={handleOpenPicker}>
        <Clock color={colors.cyan} size={20} strokeWidth={2} />
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEndEdit}
            autoFocus
            placeholder={placeholder}
            placeholderTextColor="#64748B"
          />
        ) : (
          <TouchableOpacity style={styles.valueContainer} onLongPress={handleStartEdit}>
            <Text style={[styles.valueText, !displayValue && styles.placeholder]}>
              {displayValue || placeholder}
            </Text>
          </TouchableOpacity>
        )}
        <ChevronDown color="#64748B" size={20} />
      </TouchableOpacity>

      {/* Time Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Manual input field */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                value={`${selectedHour}:${selectedMinute} ${selectedPeriod}`}
                onChangeText={(text) => {
                  const match = text.match(/^(\d{0,2}):?(\d{0,2})\s*(AM|PM)?$/i);
                  if (match) {
                    if (match[1]) setSelectedHour(match[1].padStart(2, '0').slice(-2));
                    if (match[2]) setSelectedMinute(match[2].padStart(2, '0').slice(-2));
                    if (match[3]) setSelectedPeriod(match[3].toUpperCase());
                  }
                }}
                placeholder="HH:MM AM/PM"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.pickerColumns}>
              {/* Hour */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Hour</Text>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.option, selectedHour === h && styles.optionActive]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text style={[styles.optionText, selectedHour === h && styles.optionTextActive]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Min</Text>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.option, selectedMinute === m && styles.optionActive]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={[styles.optionText, selectedMinute === m && styles.optionTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Period */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Period</Text>
                <View style={styles.periodOptions}>
                  {PERIODS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.option, selectedPeriod === p && styles.optionActive]}
                      onPress={() => setSelectedPeriod(p)}
                    >
                      <Text style={[styles.optionText, selectedPeriod === p && styles.optionTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  container: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    color: '#64748B',
    fontWeight: '400',
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A0B',
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
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  manualInputContainer: {
    marginBottom: 20,
  },
  manualInput: {
    backgroundColor: '#0A0F14',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
    borderRadius: 12,
    padding: 16,
    color: colors.textPrimary,
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
    color: '#94A3B8',
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
    backgroundColor: '#0A0F14',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  optionText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.cyan,
  },
  doneBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#0A0A0B',
    fontSize: 15,
    fontWeight: '700',
  },
});
