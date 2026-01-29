/**
 * Custom DateTimePicker with text input and calendar grid
 * Supports both manual date entry and visual calendar selection
 * Responsive for mobile and desktop
 */

import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface DateTimePickerProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (event: unknown, date?: Date) => void;
}

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Check if desktop based on screen width
const getIsDesktop = () => {
  const { width } = Dimensions.get('window');
  return Platform.OS === 'web' && width >= 768;
};

export default function DateTimePicker({
  value,
  minimumDate,
  maximumDate,
  onChange,
}: DateTimePickerProps) {
  const [displayMonth, setDisplayMonth] = useState(value.getMonth());
  const [displayYear, setDisplayYear] = useState(value.getFullYear());
  const [textInput, setTextInput] = useState(formatDateToInput(value));

  // Update text input when value changes externally
  useEffect(() => {
    setTextInput(formatDateToInput(value));
  }, [value]);

  function formatDateToInput(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function parseInputToDate(input: string): Date | null {
    // Support formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const parts = input.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;

    const date = new Date(year, month, day);
    // Validate the date is real (e.g., not Feb 31)
    if (date.getDate() !== day) return null;

    return date;
  }

  function isDateDisabled(date: Date): boolean {
    if (
      minimumDate &&
      date < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())
    ) {
      return true;
    }
    if (
      maximumDate &&
      date > new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate())
    ) {
      return true;
    }
    return false;
  }

  function handleTextSubmit() {
    const parsed = parseInputToDate(textInput);
    if (parsed && !isDateDisabled(parsed)) {
      setDisplayMonth(parsed.getMonth());
      setDisplayYear(parsed.getFullYear());
      onChange?.(null, parsed);
    } else {
      // Reset to current value if invalid
      setTextInput(formatDateToInput(value));
    }
  }

  function handleDayPress(day: number) {
    const newDate = new Date(displayYear, displayMonth, day);
    if (!isDateDisabled(newDate)) {
      setTextInput(formatDateToInput(newDate));
      onChange?.(null, newDate);
    }
  }

  function goToPreviousMonth() {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  }

  function goToNextMonth() {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  }

  function getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }

  function renderCalendarGrid() {
    const daysInMonth = getDaysInMonth(displayMonth, displayYear);
    const firstDay = getFirstDayOfMonth(displayMonth, displayYear);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Split into weeks
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Pad the last week if needed
    const lastWeek = weeks[weeks.length - 1];
    while (lastWeek.length < 7) {
      lastWeek.push(null);
    }

    return weeks;
  }

  const selectedDay = value.getDate();
  const selectedMonth = value.getMonth();
  const selectedYear = value.getFullYear();
  const today = new Date();
  const isDesktop = getIsDesktop();
  const DAYS = isDesktop ? DAYS_FULL : DAYS_SHORT;

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {/* Text Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textInput, isDesktop && styles.textInputDesktop]}
          value={textInput}
          onChangeText={setTextInput}
          onBlur={handleTextSubmit}
          onSubmitEditing={handleTextSubmit}
          placeholder="DD/MM/YYYY"
          placeholderTextColor="#a3a3a3"
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <Pressable
          onPress={goToPreviousMonth}
          style={[styles.navButton, isDesktop && styles.navButtonDesktop]}
        >
          <Ionicons name="chevron-back" size={isDesktop ? 18 : 16} color={Colors.light.primary} />
        </Pressable>
        <Text style={[styles.monthYearText, isDesktop && styles.monthYearTextDesktop]}>
          {isDesktop ? MONTHS[displayMonth] : MONTHS_SHORT[displayMonth]} {displayYear}
        </Text>
        <Pressable
          onPress={goToNextMonth}
          style={[styles.navButton, isDesktop && styles.navButtonDesktop]}
        >
          <Ionicons name="chevron-forward" size={isDesktop ? 18 : 16} color={Colors.light.primary} />
        </Pressable>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaderRow}>
        {DAYS.map((day, index) => (
          <Text key={index} style={[styles.dayHeader, isDesktop && styles.dayHeaderDesktop]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {renderCalendarGrid().map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return (
                  <View
                    key={dayIndex}
                    style={[styles.dayCell, isDesktop && styles.dayCellDesktop]}
                  />
                );
              }

              const date = new Date(displayYear, displayMonth, day);
              const isSelected =
                day === selectedDay &&
                displayMonth === selectedMonth &&
                displayYear === selectedYear;
              const isToday =
                day === today.getDate() &&
                displayMonth === today.getMonth() &&
                displayYear === today.getFullYear();
              const disabled = isDateDisabled(date);

              return (
                <Pressable
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    isDesktop && styles.dayCellDesktop,
                    isSelected && styles.selectedDay,
                    isToday && !isSelected && styles.todayDay,
                    disabled && styles.disabledDay,
                  ]}
                  onPress={() => handleDayPress(day)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isToday && !isSelected && styles.todayDayText,
                      disabled && styles.disabledDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected Date Display */}
      <View style={styles.selectedDisplay}>
        <Ionicons name="calendar" size={16} color={Colors.light.primary} />
        <Text style={styles.selectedText}>
          Selected:{' '}
          {value.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mobile styles (default - compact)
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 8,
  },
  containerDesktop: {
    padding: 16,
    borderRadius: 12,
    maxWidth: 320,
  },
  inputRow: {
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#171717',
    backgroundColor: '#fafafa',
  },
  textInputDesktop: {
    fontSize: 14,
    paddingVertical: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  navButtonDesktop: {
    padding: 6,
  },
  monthYearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  monthYearTextDesktop: {
    fontSize: 14,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
    color: '#737373',
  },
  dayHeaderDesktop: {
    fontSize: 11,
  },
  calendarGrid: {
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    margin: 1,
  },
  dayCellDesktop: {
    height: 32,
  },
  dayText: {
    fontSize: 12,
    color: '#171717',
  },
  selectedDay: {
    backgroundColor: Colors.light.primary,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  todayDayText: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#a3a3a3',
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  selectedText: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '500',
    flex: 1,
  },
});
