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
import { useTheme } from '../theme/ThemeContext';

interface DateInputProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  /** Maximum selectable date in YYYY-MM-DD format. Days after this are disabled. */
  maxDate?: string;
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

export default function DateInput({ value, onChange, placeholder = 'Select date', label, maxDate }: DateInputProps) {
  const { colors } = useTheme();
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

  /** Central guard: reject dates beyond maxDate */
  const isDateAllowed = (dateStr: string): boolean => {
    if (!maxDate) return true;
    return dateStr <= maxDate;
  };

  const handleSelectDay = (day: number) => {
    const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (!isDateAllowed(dateStr)) return;
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
      if (!isNaN(date.getTime()) && isDateAllowed(editValue)) {
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

  const isDayDisabled = (day: number | null) => {
    if (!day || !maxDate) return false;
    const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return dateStr > maxDate;
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
      if (!isNaN(date.getTime()) && isDateAllowed(manualInput)) {
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
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity style={[styles.container, { backgroundColor: colors.bgDark, borderColor: colors.borderSubtle }]} onPress={handleOpenPicker}>
        <Calendar color={colors.cyan} size={20} strokeWidth={2} />
        {isEditing ? (
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEndEdit}
            autoFocus
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <TouchableOpacity style={styles.valueContainer} onLongPress={handleStartEdit}>
            <Text style={[styles.valueText, { color: colors.textPrimary }, !value && { color: colors.textMuted }]}>
              {formatDisplayDate(value) || placeholder}
            </Text>
          </TouchableOpacity>
        )}
        <ChevronDown color={colors.textMuted} size={20} />
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleClosePicker}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayHeavy }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Date</Text>
              <TouchableOpacity onPress={handleClosePicker}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Manual input field */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={[styles.manualInput, { color: colors.textPrimary, backgroundColor: colors.bgDark, borderColor: colors.cyanGlow }]}
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
                placeholderTextColor={colors.textMuted}
                maxLength={10}
              />
            </View>

            {/* ===== YEAR PICKER VIEW ===== */}
            {viewMode === 'year' && (
              <>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={() => setYearRangeStart(yearRangeStart - 12)}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <Text style={[styles.monthYearText, { color: colors.textPrimary }]}>
                    {yearRangeStart} – {yearRangeStart + 11}
                  </Text>
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={() => setYearRangeStart(yearRangeStart + 12)}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                <View style={styles.yearGrid}>
                  {yearGrid.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearCell,
                        { backgroundColor: colors.bgSubtle },
                        year === viewYear && { backgroundColor: colors.cyan },
                        year === thisYear && { borderWidth: 1, borderColor: colors.cyan },
                      ]}
                      onPress={() => handleSelectYear(year)}
                    >
                      <Text style={[
                        styles.yearText,
                        { color: colors.textPrimary },
                        year === viewYear && { color: colors.bg, fontWeight: '700' as const },
                        year === thisYear && !viewYear && { color: colors.cyan },
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
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={() => setViewYear(viewYear - 1)}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setYearRangeStart(viewYear - 4); setViewMode('year'); }}>
                    <Text style={[styles.monthYearText, styles.tappableHeader, { color: colors.cyan, textDecorationColor: colors.cyanGlow }]}>
                      {viewYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={() => setViewYear(viewYear + 1)}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                <View style={styles.monthGrid}>
                  {MONTHS_SHORT.map((m, index) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.monthCell,
                        { backgroundColor: colors.bgSubtle },
                        index === viewMonth && viewYear === currentYear && { backgroundColor: colors.cyan },
                      ]}
                      onPress={() => handleSelectMonth(index)}
                    >
                      <Text style={[
                        styles.monthCellText,
                        { color: colors.textPrimary },
                        index === viewMonth && viewYear === currentYear && { color: colors.bg, fontWeight: '700' as const },
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
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={handlePrevMonth}>
                    <ChevronLeft color={colors.cyan} size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleHeaderTap}>
                    <Text style={[styles.monthYearText, styles.tappableHeader, { color: colors.cyan, textDecorationColor: colors.cyanGlow }]}>
                      {MONTHS[viewMonth]} {viewYear}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cyanDim }]} onPress={handleNextMonth}>
                    <ChevronRight color={colors.cyan} size={24} />
                  </TouchableOpacity>
                </View>

                {/* Days of Week Header */}
                <View style={styles.daysOfWeekRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Text key={day} style={[styles.dayOfWeekText, { color: colors.textMuted }]}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        isSelectedDay(day) && { backgroundColor: colors.cyan },
                        isToday(day) && !isDayDisabled(day) && { borderWidth: 1, borderColor: colors.cyan },
                        isDayDisabled(day) && { opacity: 0.25 },
                      ]}
                      onPress={() => day && !isDayDisabled(day) && handleSelectDay(day)}
                      disabled={!day || isDayDisabled(day)}
                    >
                      {day && (
                        <Text style={[
                          styles.dayText,
                          { color: colors.textPrimary },
                          isSelectedDay(day) && { color: colors.bg, fontWeight: '700' as const },
                          isToday(day) && !isDayDisabled(day) && { color: colors.cyan },
                        ]}>
                          {day}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick actions — hide "Today" if maxDate prevents selecting today */}
                {(() => {
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                  if (maxDate && todayStr > maxDate) return null;
                  return (
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: colors.cyanDim, borderColor: colors.cyan }]}
                        onPress={() => {
                          onChange(todayStr);
                          handleClosePicker();
                        }}
                      >
                        <Text style={[styles.quickActionText, { color: colors.cyan }]}>Today</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
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
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '700',
  },
  tappableHeader: {
    textDecorationLine: 'underline',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
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
  dayText: {
    fontSize: 14,
    fontWeight: '500',
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
    borderWidth: 1,
  },
  quickActionText: {
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
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  monthCellText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
