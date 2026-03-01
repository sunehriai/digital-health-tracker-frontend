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
import { colors } from '../theme/colors';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
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
  const { prefs, loading, syncing, updatePref } = useNotificationPrefs();
  const isFocused = useIsFocused();

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
      <SafeAreaView style={styles.safe} edges={['top']}>
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Control your alerts</Text>
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
              <Text style={styles.permissionTitle}>Notifications Disabled</Text>
              <Text style={styles.permissionSubtitle}>
                Tap to open Settings and enable notifications for Vision
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
          </TouchableOpacity>
        )}

        {/* ── DOSE REMINDERS ── */}
        <Text style={styles.sectionTitle}>DOSE REMINDERS</Text>

        {/* Master toggle */}
        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Bell color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Dose Reminders</Text>
            <Text style={styles.settingSubtitle}>Get notified when it's time for a dose</Text>
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
              style={styles.settingCard}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowAdvance)}
            >
              <View style={styles.settingIcon}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Advance Reminder</Text>
                <Text style={styles.settingSubtitle}>How early to remind you</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{getAdvanceLabel()}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showAdvance && (
              <View style={styles.pickerDropdown}>
                {ADVANCE_REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
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
                        prefs.advance_reminder_minutes === option.value && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Snooze Toggle */}
            <View style={styles.settingCard}>
              <View style={styles.settingIcon}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Snooze</Text>
                <Text style={styles.settingSubtitle}>Allow snoozing dose reminders (up to 3x)</Text>
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
                  style={styles.settingCard}
                  activeOpacity={0.8}
                  onPress={() => toggleDropdown(setShowSnooze)}
                >
                  <View style={styles.settingIcon}>
                    <Clock color={colors.cyan} size={20} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Snooze Duration</Text>
                    <Text style={styles.settingSubtitle}>Time before re-alerting</Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={styles.settingValueText}>{getSnoozeLabel()}</Text>
                    <ChevronDown color={colors.textMuted} size={18} />
                  </View>
                </TouchableOpacity>

                {showSnooze && (
                  <View style={styles.pickerDropdown}>
                    {SNOOZE_DURATION_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
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
                            prefs.snooze_duration_minutes === option.value && styles.pickerOptionTextSelected,
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
        <Text style={styles.sectionTitle}>REFILL ALERTS</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Package color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Refill Alerts</Text>
            <Text style={styles.settingSubtitle}>Low stock warnings</Text>
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
              style={styles.settingCard}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowThreshold)}
            >
              <View style={styles.settingIcon}>
                <AlertTriangle color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Alert Threshold</Text>
                <Text style={styles.settingSubtitle}>Alert when supply falls below</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{getThresholdLabel()}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showThreshold && (
              <View style={styles.pickerDropdown}>
                {THRESHOLD_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
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
                        prefs.low_stock_threshold_days === option.value && styles.pickerOptionTextSelected,
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
        <Text style={styles.sectionTitle}>ACHIEVEMENTS & PROGRESS</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Trophy color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Achievement Notifications</Text>
            <Text style={styles.settingSubtitle}>Gamification alerts and milestones</Text>
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
            <View style={[styles.settingCard, styles.subSettingCard]}>
              <View style={styles.settingIcon}>
                <Flame color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Streak Milestones</Text>
                <Text style={styles.settingSubtitle}>7-day, 30-day streak alerts</Text>
              </View>
              <Switch
                value={prefs.streak_milestones_enabled}
                onValueChange={(v) => updatePref('streak_milestones_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Tier Advancement */}
            <View style={[styles.settingCard, styles.subSettingCard]}>
              <View style={styles.settingIcon}>
                <Award color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Tier Advancement</Text>
                <Text style={styles.settingSubtitle}>Tier-up celebration alerts</Text>
              </View>
              <Switch
                value={prefs.tier_advancement_enabled}
                onValueChange={(v) => updatePref('tier_advancement_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Waiver Prompts */}
            <View style={[styles.settingCard, styles.subSettingCard]}>
              <View style={styles.settingIcon}>
                <Shield color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Waiver Prompts</Text>
                <Text style={styles.settingSubtitle}>Streak protection badge reminders</Text>
              </View>
              <Switch
                value={prefs.waiver_prompt_enabled}
                onValueChange={(v) => updatePref('waiver_prompt_enabled', v)}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Comeback Boost */}
            <View style={[styles.settingCard, styles.subSettingCard]}>
              <View style={styles.settingIcon}>
                <Zap color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Comeback Boost</Text>
                <Text style={styles.settingSubtitle}>Boost availability alerts</Text>
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
        <Text style={styles.sectionTitle}>SYSTEM & SAFETY</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Bell color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>System Alerts</Text>
            <Text style={styles.settingSubtitle}>App updates and system messages</Text>
          </View>
          <Switch
            value={prefs.system_notifications_enabled}
            onValueChange={(v) => updatePref('system_notifications_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <AlertTriangle color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.settingTitle}>Safety Alerts</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            </View>
            <Text style={styles.settingSubtitle}>Allergy and interaction warnings</Text>
          </View>
          <Switch
            value={prefs.safety_alerts_enabled}
            onValueChange={(v) => updatePref('safety_alerts_enabled', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Calendar color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Prescription End Alerts</Text>
            <Text style={styles.settingSubtitle}>Notify before medication end date</Text>
          </View>
          <Switch
            value={prefs.medication_end_date_alerts}
            onValueChange={(v) => updatePref('medication_end_date_alerts', v)}
            trackColor={{ false: colors.border, true: colors.cyan }}
            thumbColor="#fff"
          />
        </View>

        {/* ── QUIET HOURS ── */}
        <Text style={styles.sectionTitle}>QUIET HOURS</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Moon color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Quiet Hours</Text>
            <Text style={styles.settingSubtitle}>Silence non-critical notifications</Text>
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
              style={styles.settingCard}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowQuietStart)}
            >
              <View style={styles.settingIcon}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Start Time</Text>
                <Text style={styles.settingSubtitle}>When quiet hours begin</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{prefs.quiet_hours_start}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showQuietStart && (
              <View style={[styles.pickerDropdown, styles.timePicker]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {HOURS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
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
                          prefs.quiet_hours_start === option.value && styles.pickerOptionTextSelected,
                          option.value === prefs.quiet_hours_end && styles.pickerOptionDisabled,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Quiet End */}
            <TouchableOpacity
              style={styles.settingCard}
              activeOpacity={0.8}
              onPress={() => toggleDropdown(setShowQuietEnd)}
            >
              <View style={styles.settingIcon}>
                <Clock color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>End Time</Text>
                <Text style={styles.settingSubtitle}>When quiet hours end</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{prefs.quiet_hours_end}</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </View>
            </TouchableOpacity>

            {showQuietEnd && (
              <View style={[styles.pickerDropdown, styles.timePicker]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {HOURS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
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
                          prefs.quiet_hours_end === option.value && styles.pickerOptionTextSelected,
                          option.value === prefs.quiet_hours_start && styles.pickerOptionDisabled,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Critical Bypass */}
            <View style={styles.settingCard}>
              <View style={styles.settingIcon}>
                <Shield color={colors.cyan} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Critical Medication Bypass</Text>
                <Text style={styles.settingSubtitle}>Critical meds still alert during quiet hours</Text>
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
        <Text style={styles.sectionTitle}>MEDICATION-SPECIFIC</Text>

        <TouchableOpacity
          style={styles.settingCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PerMedicationNotif')}
        >
          <View style={styles.settingIcon}>
            <Pill color={colors.cyan} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Per-Medication Settings</Text>
            <Text style={styles.settingSubtitle}>Override alerts for individual medications</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={20} />
        </TouchableOpacity>

        {/* Info Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Info color={colors.cyan} size={18} />
            <Text style={styles.noticeTitle}>Local Notifications</Text>
          </View>
          <Text style={styles.noticeText}>
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
  safe: { flex: 1, backgroundColor: '#080A0F' },
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
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: colors.textMuted,
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
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    color: colors.cyan,
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
    backgroundColor: '#121721',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2633',
  },
  subSettingCard: {
    marginLeft: 20,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    color: colors.cyan,
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
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '700',
  },

  // Picker Dropdown
  pickerDropdown: {
    backgroundColor: '#121721',
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  timePicker: {
    maxHeight: 210,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2633',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  pickerOptionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    color: colors.cyan,
    fontWeight: '600',
  },
  pickerOptionDisabled: {
    color: colors.textMuted,
    opacity: 0.5,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.cyan,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
