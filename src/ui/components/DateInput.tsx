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
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface DateInputProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ViewMode = 'calendar' | 'year' | 'month';

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function DateInput({ value, onChange, placeholder = 'Select date', label }: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [yearRangeStart, setYearRangeStart] = useState(2020); // start of the 12-year grid

  // Parse current value or use today
  const parseDate = (dateStr: string) => {
    if (!dateStr) {
      const today = new Date();
      return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
    }
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      const today = new Date();
      return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
    }
    return { year, month: month - 1, day };
  };

  const { year: currentYear, month: currentMonth, day: currentDay } = parseDate(value);
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const { year, month, day } = parseDate(dateStr);
    if (month < 0 || month > 11 || isNaN(day)) return dateStr;
    return `${MONTHS[month].slice(0, 3)} ${day}, ${year}`;
  };

  const handleOpenPicker = () => {
    const { year, month } = parseDate(value);
    setViewYear(year);
    setViewMonth(month);
    setManualInput(value);
    setViewMode('calendar');
    // Center year grid around the current view year
    setYearRangeStart(year - 4);
    setShowPicker(true);
  };

  const handleClosePicker = () => {
    setShowPicker(false);
    setViewMode('calendar');
  };

  const handleSelectDay = (day: number) => {
    const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange(dateStr);
    handleClosePicker();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    setIsEditing(false);
    const match = editValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [_, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        onChange(editValue);
      }
    }
  };

  const handleHeaderTap = () => {
    if (viewMode === 'calendar') {
      setYearRangeStart(viewYear - 4);
      setViewMode('year');
    } else {
      setViewMode('calendar');
    }
  };

  const handleSelectYear = (year: number) => {
    setViewYear(year);
    setViewMode('month');
  };

  const handleSelectMonth = (month: number) => {
    setViewMonth(month);
    setViewMode('calendar');
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const isSelectedDay = (day: number | null) => {
    if (!day || !value) return false;
    return viewYear === currentYear && viewMonth === currentMonth && day === currentDay;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  };

  // Generate year grid (12 years at a time)
  const yearGrid: number[] = [];
  for (let i = 0; i < 12; i++) {
    yearGrid.push(yearRangeStart + i);
  }

  const thisYear = new Date().getFullYear();

  const handleManualInputCommit = () => {
    const match = manualInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      if (!isNaN(date.getTime())) {
        onChange(manualInput);
        const parsed = parseDate(manualInput);
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
        setYearRangeStart(parsed.year - 4);
      }
    }
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.container} onPress={handleOpenPicker}>
        <Calendar color={colors.cyan} size={20} strokeWidth={2} />
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEndEdit}
            autoFocus
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
          />
        ) : (
          <TouchableOpacity style={styles.valueContainer} onLongPress={handleStartEdit}>
            <Text style={[styles.valueText, !value && styles.placeholder]}>
              {formatDisplayDate(value) || placeholder}
            </Text>
          </TouchableOpacity>
        )}
        <ChevronDown color="#64748B" size={20} />
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleClosePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleClosePicker}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Manual input field */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                value={manualInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9-]/g, '');
                  if (cleaned.length <= 10) {
                    setManualInput(cleaned);
                  }
                }}
                onBlur={handleManualInputCommit}
                onSubmitEditing={handleManualInputCommit}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
                maxLength={10}
              />
            </View>

            {/* ===== YEAR PICKER VIEW ===== */}
            {viewMode === 'year' && (
              <>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setYearRangeStart(yearRangeStart - 12)}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <Text style={styles.monthYearText}>
                    {yearRangeStart} – {yearRangeStart + 11}
                  </Text>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setYearRangeStart(yearRangeStart + 12)}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                <View style={styles.yearGrid}>
                  {yearGrid.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearCell,
                        year === viewYear && styles.yearCellSelected,
                        year === thisYear && styles.yearCellCurrent,
                      ]}
                      onPress={() => handleSelectYear(year)}
                    >
                      <Text style={[
                        styles.yearText,
                        year === viewYear && styles.yearTextSelected,
                        year === thisYear && !viewYear && styles.yearTextCurrent,
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ===== MONTH PICKER VIEW ===== */}
            {viewMode === 'month' && (
              <>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setViewYear(viewYear - 1)}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setYearRangeStart(viewYear - 4); setViewMode('year'); }}>
                    <Text style={[styles.monthYearText, styles.tappableHeader]}>
                      {viewYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navBtn} onPress={() => setViewYear(viewYear + 1)}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                <View style={styles.monthGrid}>
                  {MONTHS_SHORT.map((m, index) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.monthCell,
                        index === viewMonth && viewYear === currentYear && styles.monthCellSelected,
                      ]}
                      onPress={() => handleSelectMonth(index)}
                    >
                      <Text style={[
                        styles.monthCellText,
                        index === viewMonth && viewYear === currentYear && styles.monthCellTextSelected,
                      ]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ===== CALENDAR VIEW ===== */}
            {viewMode === 'calendar' && (
              <>
                {/* Month/Year Navigation — tappable to jump */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleHeaderTap}>
                    <Text style={[styles.monthYearText, styles.tappableHeader]}>
                      {MONTHS[viewMonth]} {viewYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                {/* Days of Week Header */}
                <View style={styles.daysOfWeekRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        isSelectedDay(day) && styles.dayCellSelected,
                        isToday(day) && styles.dayCellToday,
                      ]}
                      onPress={() => day && handleSelectDay(day)}
                      disabled={!day}
                    >
                      {day && (
                        <Text style={[
                          styles.dayText,
                          isSelectedDay(day) && styles.dayTextSelected,
                          isToday(day) && styles.dayTextToday,
                        ]}>
                          {day}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => {
                      const today = new Date();
                      const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                      onChange(dateStr);
                      handleClosePicker();
                    }}
                  >
                    <Text style={styles.quickActionText}>Today</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    color: '#64748B',
    fontWeight: '400',
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  tappableHeader: {
    color: colors.cyan,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(0, 209, 255, 0.4)',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: colors.cyan,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  dayTextToday: {
    color: colors.cyan,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  quickActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  quickActionText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '600',
  },

  // Year picker
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  yearCell: {
    width: '22%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  yearCellSelected: {
    backgroundColor: colors.cyan,
  },
  yearCellCurrent: {
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  yearText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  yearTextSelected: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
  yearTextCurrent: {
    color: colors.cyan,
  },

  // Month picker
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  monthCell: {
    width: '28%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  monthCellSelected: {
    backgroundColor: colors.cyan,
  },
  monthCellText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  monthCellTextSelected: {
    color: '#0A0A0B',
    fontWeight: '700',
  },
});
