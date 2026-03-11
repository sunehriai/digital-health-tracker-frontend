import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useIsFocused } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Bell,
  BellOff,
  Clock,
  Moon,
  Pill,
  Package,
  Trophy,
  Flame,
  Award,
  Zap,
  Shield,
  AlertTriangle,
  Calendar,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { formatTime } from '../../domain/utils/dateTimeUtils';
import type { RootStackScreenProps } from '../navigation/types';

// Dropdown option types
interface DropdownOption<T> {
  label: string;
  value: T;
}

const ADVANCE_REMINDER_OPTIONS: DropdownOption<number>[] = [
  { label: 'At dose time', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
];

const SNOOZE_DURATION_OPTIONS: DropdownOption<number>[] = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
];

const THRESHOLD_OPTIONS: DropdownOption<number>[] = [
  { label: '3 days', value: 3 },
  { label: '5 days', value: 5 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return { label: `${h}:00`, value: `${h}:00` };
});

export default function NotificationPrefsScreen({ navigation }: RootStackScreenProps<'NotificationPrefs'>) {
  const { colors } = useTheme();
  const { prefs, loading, syncing, updatePref } = useNotificationPrefs();
  const { prefs: appPrefs } = useAppPreferences();
  const isFocused = useIsFocused();

  /** Format a "HH:00" value for display using the user's time format preference. */
  const fmtHour = (value: string) => formatTime(value, appPrefs.timeFormat);

  // OS permission state
  const [osPermission, setOsPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  // Dropdown visibility
  const [showAdvance, setShowAdvance] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);
  const [showQuietStart, setShowQuietStart] = useState(false);
  const [showQuietEnd, setShowQuietEnd] = useState(false);

  // Check OS permission on focus
  useEffect(() => {
    if (isFocused) {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setOsPermission(status);
      });
    }
  }, [isFocused]);

  const closeAllDropdowns = useCallback(() => {
    setShowAdvance(false);
    setShowSnooze(false);
    setShowThreshold(false);
    setShowQuietStart(false);
    setShowQuietEnd(false);
  }, []);

  const toggleDropdown = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      closeAllDropdowns();
      setter((prev) => !prev);
    },
    [closeAllDropdowns],
  );

  if (loading || !prefs) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </View>
      </SafeAreaView>
    );
  }

  const getAdvanceLabel = () =>
    ADVANCE_REMINDER_OPTIONS.find((o) => o.value === prefs.advance_reminder_minutes)?.label ?? 'At dose time';
  const getSnoozeLabel = () =>
    SNOOZE_DURATION_OPTIONS.find((o) => o.value === prefs.snooze_duration_minutes)?.label ?? '10 minutes';
  const getThresholdLabel = () =>
    THRESHOLD_OPTIONS.find((o) => o.value === prefs.low_stock_threshold_days)?.label ?? '7 days';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Control your alerts</Text>
        </View>
        <View style={{ width: 40 }}>
          {syncing && <ActivityIndicator size="small" color={colors.cyan} />}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* OS Permission Banner */}
        {osPermission !== 'granted' && (
          <TouchableOpacity
            style={styles.permissionBanner}
            activeOpacity={0.8}
            onPress={() => Linking.openSettings()}
          >
            <BellOff color={colors.warning} size={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.permissionTitle, { color: colors.warning }]}>Notifications Disabled</Text>
              <Text style={[styles.permissionSubtitle, { color: colors.textMuted }]}>
                Tap to open Settings and enable notifications for Vision
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
          </TouchableOpacity>
        )}

        {/* ── DOSE REMINDERS ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>DOSE REMINDERS</Text>

        {/* Master toggle */}
        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Bell color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Dose Reminders</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Get notified when it's time for a dose</Text>
          </View>
          <Switch
            value={prefs.dose_reminders_enabled}
            onValueChange={(v) => updatePref('dose_reminders_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {prefs.dose_reminders_enabled && (
          <>
            {/* Advance Reminder */}
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowAdvance)}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Advance Reminder</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>How early to remind you</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.cyan }]}>{getAdvanceLabel()}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showAdvance && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                {ADVANCE_REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      { borderBottomColor: colors.border },
                      prefs.advance_reminder_minutes === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      updatePref('advance_reminder_minutes', option.value);
                      setShowAdvance(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.textSecondary },
                        prefs.advance_reminder_minutes === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Snooze Toggle */}
            <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Snooze</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Allow snoozing dose reminders (up to 3x)</Text>
              </View>
              <Switch
                value={prefs.snooze_enabled}
                onValueChange={(v) => updatePref('snooze_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {prefs.snooze_enabled && (
              <>
                {/* Snooze Duration */}
                <TouchableOpacity
                  style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => toggleDropdown(setShowSnooze)}
                >
                  <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                    <Clock color={colors.cyan} size={20} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Snooze Duration</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Time before re-alerting</Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={[styles.settingValueText, { color: colors.cyan }]}>{getSnoozeLabel()}</Text>
                    <ChevronDown color={colors.textMuted} size={18} />
                  </View>
                </TouchableOpacity>

                {showSnooze && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                    {SNOOZE_DURATION_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          { borderBottomColor: colors.border },
                          prefs.snooze_duration_minutes === option.value && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          updatePref('snooze_duration_minutes', option.value);
                          setShowSnooze(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: colors.textSecondary },
                            prefs.snooze_duration_minutes === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── REFILL ALERTS ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>REFILL ALERTS</Text>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Package color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Refill Alerts</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Low stock warnings</Text>
          </View>
          <Switch
            value={prefs.refill_alerts_enabled}
            onValueChange={(v) => updatePref('refill_alerts_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {prefs.refill_alerts_enabled && (
          <>
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowThreshold)}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <AlertTriangle color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Alert Threshold</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Alert when supply falls below</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.cyan }]}>{getThresholdLabel()}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showThreshold && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                {THRESHOLD_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      { borderBottomColor: colors.border },
                      prefs.low_stock_threshold_days === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      updatePref('low_stock_threshold_days', option.value);
                      setShowThreshold(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.textSecondary },
                        prefs.low_stock_threshold_days === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── ACHIEVEMENTS & PROGRESS ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>ACHIEVEMENTS & PROGRESS</Text>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Trophy color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Achievement Notifications</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Gamification alerts and milestones</Text>
          </View>
          <Switch
            value={prefs.gamification_notifications_enabled}
            onValueChange={(v) => updatePref('gamification_notifications_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {prefs.gamification_notifications_enabled && (
          <>
            {/* Streak Milestones */}
            <View style={[styles.settingCard, styles.subSettingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Flame color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Streak Milestones</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>7-day, 30-day streak alerts</Text>
              </View>
              <Switch
                value={prefs.streak_milestones_enabled}
                onValueChange={(v) => updatePref('streak_milestones_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Tier Advancement */}
            <View style={[styles.settingCard, styles.subSettingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Award color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Tier Advancement</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Tier-up celebration alerts</Text>
              </View>
              <Switch
                value={prefs.tier_advancement_enabled}
                onValueChange={(v) => updatePref('tier_advancement_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Waiver Prompts */}
            <View style={[styles.settingCard, styles.subSettingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Shield color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Waiver Prompts</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Streak protection badge reminders</Text>
              </View>
              <Switch
                value={prefs.waiver_prompt_enabled}
                onValueChange={(v) => updatePref('waiver_prompt_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Comeback Boost */}
            <View style={[styles.settingCard, styles.subSettingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Zap color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Comeback Boost</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Boost availability alerts</Text>
              </View>
              <Switch
                value={prefs.comeback_boost_enabled}
                onValueChange={(v) => updatePref('comeback_boost_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}

        {/* ── SYSTEM & SAFETY ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>SYSTEM & SAFETY</Text>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Bell color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>System Alerts</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>App updates and system messages</Text>
          </View>
          <Switch
            value={prefs.system_notifications_enabled}
            onValueChange={(v) => updatePref('system_notifications_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <AlertTriangle color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Safety Alerts</Text>
              <View style={styles.recommendedBadge}>
                <Text style={[styles.recommendedText, { color: colors.cyan }]}>Recommended</Text>
              </View>
            </View>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Allergy and interaction warnings</Text>
          </View>
          <Switch
            value={prefs.safety_alerts_enabled}
            onValueChange={(v) => updatePref('safety_alerts_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Calendar color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Prescription End Alerts</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Notify before medication end date</Text>
          </View>
          <Switch
            value={prefs.medication_end_date_alerts}
            onValueChange={(v) => updatePref('medication_end_date_alerts', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* ── QUIET HOURS ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>QUIET HOURS</Text>

        <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Moon color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Quiet Hours</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Silence non-critical notifications</Text>
          </View>
          <Switch
            value={prefs.quiet_hours_enabled}
            onValueChange={(v) => updatePref('quiet_hours_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {prefs.quiet_hours_enabled && (
          <>
            {/* Quiet Start */}
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowQuietStart)}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Start Time</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>When quiet hours begin</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.cyan }]}>{fmtHour(prefs.quiet_hours_start)}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showQuietStart && (
              <View style={[styles.pickerDropdown, styles.timePicker, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {HOURS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        { borderBottomColor: colors.border },
                        prefs.quiet_hours_start === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        if (option.value !== prefs.quiet_hours_end) {
                          updatePref('quiet_hours_start', option.value);
                        }
                        setShowQuietStart(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          { color: colors.textSecondary },
                          prefs.quiet_hours_start === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                          option.value === prefs.quiet_hours_end && [styles.pickerOptionDisabled, { color: colors.textMuted }],
                        ]}
                      >
                        {fmtHour(option.value)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Quiet End */}
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowQuietEnd)}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>End Time</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>When quiet hours end</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={[styles.settingValueText, { color: colors.cyan }]}>{fmtHour(prefs.quiet_hours_end)}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showQuietEnd && (
              <View style={[styles.pickerDropdown, styles.timePicker, { backgroundColor: colors.bgCard, borderColor: colors.cyan }]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {HOURS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        { borderBottomColor: colors.border },
                        prefs.quiet_hours_end === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        if (option.value !== prefs.quiet_hours_start) {
                          updatePref('quiet_hours_end', option.value);
                        }
                        setShowQuietEnd(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          { color: colors.textSecondary },
                          prefs.quiet_hours_end === option.value && [styles.pickerOptionTextSelected, { color: colors.cyan }],
                          option.value === prefs.quiet_hours_start && [styles.pickerOptionDisabled, { color: colors.textMuted }],
                        ]}
                      >
                        {fmtHour(option.value)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Critical Bypass */}
            <View style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
                <Shield color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Critical Medication Bypass</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Critical meds still alert during quiet hours</Text>
              </View>
              <Switch
                value={prefs.critical_bypass_quiet}
                onValueChange={(v) => updatePref('critical_bypass_quiet', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}

        {/* ── PER-MEDICATION SETTINGS ── */}
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>MEDICATION-SPECIFIC</Text>

        <TouchableOpacity
          style={[styles.settingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PerMedicationNotif')}
        >
          <View style={[styles.settingIcon, { backgroundColor: colors.cyanDim }]}>
            <Pill color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Per-Medication Settings</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Override alerts for individual medications</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Info Notice */}
        <View style={[styles.noticeCard, { borderLeftColor: colors.cyan }]}>
          <View style={styles.noticeHeader}>
            <Info color={colors.cyan} size={18} />
            <Text style={[styles.noticeTitle, { color: colors.cyan }]}>Local Notifications</Text>
          </View>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Dose reminders use local notifications scheduled on your device. They work even when offline.
            Open Vision regularly to keep reminders up to date.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // OS Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  subSettingCard: {
    marginLeft: 20,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Recommended Badge
  recommendedBadge: {
    backgroundColor: 'rgba(0, 209, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Picker Dropdown
  pickerDropdown: {
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  timePicker: {
    maxHeight: 210,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  pickerOptionText: {
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
  },
  pickerOptionDisabled: {
    opacity: 0.5,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 3,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
