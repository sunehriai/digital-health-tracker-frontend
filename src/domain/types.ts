// Database types for Vision Health Tracker — shared with web frontend

export interface Profile {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  primary_health_goal: string | null;
  primary_physician: string | null;
  created_at: string;
  // Gamification fields (read-only, managed by GamificationService)
  total_xp: number;
  current_tier: number;
  streak_days: number;
  timezone: string | null;
  streak_start_date: string | null;
  last_active_at: string | null;
  comeback_boost_until: string | null;
  waiver_badges: number;
  perfect_months_streak: number;
  // Deletion / deactivation fields
  is_deactivated: boolean;
  deletion_requested_at: string | null;
  deletion_type: 'data_only' | 'full_account' | null;
}

export interface ProfileUpdate {
  display_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  primary_health_goal?: string | null;
  primary_physician?: string | null;
  timezone?: string | null;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  strength: string | null;
  frequency: 'daily' | 'every_other_day' | 'mon_fri' | 'custom';
  custom_days: number[] | null;
  start_date: string;
  end_date: string | null;
  is_ongoing: boolean;
  is_paused: boolean;
  is_archived: boolean;
  archived_at: string | null;
  time_of_day: string;
  dose_times: string[] | null; // Array of HH:MM strings e.g. ["08:00", "20:00"]
  occurrence: 'once' | 'twice' | 'thrice';
  dose_interval_hours: number | null;
  meal_relation: 'none' | 'before' | 'with' | 'after';
  dose_size: number;
  dose_unit: 'tablets' | 'capsules' | 'mL' | 'tsp';
  initial_stock: number;
  current_stock: number;
  indication: string | null;
  special_instructions: string | null;
  allergies: string | null;
  doctor_name: string | null;
  pharmacy_name: string | null;
  brand_name: string | null;
  is_critical: boolean;
  is_as_needed: boolean;
  expiry_date: string | null;
  // AI Upload tracking fields
  entry_mode: 'manual' | 'ai_scan';
  ai_confidence_score: number | null;
  requires_review: boolean;
  created_at: string;
}

export interface DoseLog {
  id: string;
  medication_id: string;
  scheduled_at: string;
  taken_at: string | null;
  status: 'pending' | 'taken' | 'missed' | 'skipped' | 'taken_late';
  stock_decremented: boolean; // Whether stock was decremented when dose was logged
  created_at: string;
}

/** For tracking revertable doses in UI */
export interface RevertableDose {
  chipId: string;
  doseId: string;
  medicationId: string;
  takenAt: Date;
}

export interface RefillLog {
  id: string;
  medication_id: string;
  quantity_added: number;
  previous_stock: number | null;
  new_stock: number | null;
  created_at: string;
}

export interface VitalityFeedItem {
  id: string;
  user_id: string;
  type: 'refill_alert' | 'streak' | 'intake' | 'safety' | 'sync' | 'cabinet_insight';
  priority: 'high' | 'normal';
  title: string;
  subtitle: string | null;
  medication_id: string | null;
  is_archived: boolean;
  metadata: string | null; // JSON string: { xp_awarded, category, nih_source }
  created_at: string;
}

/** Parsed metadata from a cabinet_insight feed item. */
export interface FeedInsightMetadata {
  xp_awarded: number;
  category: string | null;
  nih_source: string | null;
}

/** Parse VitalityFeedItem.metadata JSON safely. */
export function parseFeedMetadata(metadataStr: string | null): FeedInsightMetadata | null {
  if (!metadataStr) return null;
  try {
    return JSON.parse(metadataStr) as FeedInsightMetadata;
  } catch {
    return null;
  }
}

/** Insight payload returned in POST /medications response. */
export interface InsightPayload {
  category: string | null;
  insight_text: string;
  nih_source: string | null;
  xp_awarded: number;
}

/** POST /medications response — Medication with insight field. */
export interface MedicationWithInsight extends Medication {
  insight: InsightPayload;
}

export interface MedicalContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface EmergencyVault {
  id: string;
  user_id: string;
  allergies: string[] | null;
  blood_type: string | null;
  conditions: string[] | null;
  medical_contacts: MedicalContact[];
  weight: number | null;
  age: number | null;
  updated_at: string;
}

// Insert types (without auto-generated fields)
export interface MedicationInsert {
  name: string;
  strength?: string | null;
  frequency?: 'daily' | 'every_other_day' | 'mon_fri' | 'custom';
  custom_days?: number[] | null;
  start_date: string;
  end_date?: string | null;
  is_ongoing?: boolean;
  time_of_day: string;
  dose_times?: string[] | null; // Array of HH:MM strings
  occurrence?: 'once' | 'twice' | 'thrice';
  dose_interval_hours?: number | null;
  meal_relation?: 'none' | 'before' | 'with' | 'after';
  dose_size?: number;
  dose_unit?: 'tablets' | 'capsules' | 'mL' | 'tsp';
  initial_stock: number;
  current_stock: number;
  indication?: string | null;
  special_instructions?: string | null;
  allergies?: string | null;
  doctor_name?: string | null;
  pharmacy_name?: string | null;
  brand_name?: string | null;
  is_critical?: boolean;
  is_as_needed?: boolean;
  expiry_date?: string | null;
  // AI Upload tracking fields
  entry_mode?: 'manual' | 'ai_scan';
  ai_confidence_score?: number | null;
  requires_review?: boolean;
}

export interface MedicationUpdate {
  name?: string;
  strength?: string | null;
  frequency?: 'daily' | 'every_other_day' | 'mon_fri' | 'custom';
  custom_days?: number[] | null;
  start_date?: string;
  end_date?: string | null;
  is_ongoing?: boolean;
  is_paused?: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  time_of_day?: string;
  dose_times?: string[] | null;
  occurrence?: 'once' | 'twice' | 'thrice';
  dose_interval_hours?: number | null;
  meal_relation?: 'none' | 'before' | 'with' | 'after';
  dose_size?: number;
  dose_unit?: 'tablets' | 'capsules' | 'mL' | 'tsp';
  initial_stock?: number;
  current_stock?: number;
  indication?: string | null;
  special_instructions?: string | null;
  allergies?: string | null;
  doctor_name?: string | null;
  pharmacy_name?: string | null;
  brand_name?: string | null;
  is_critical?: boolean;
  is_as_needed?: boolean;
  expiry_date?: string | null;
  // AI Upload tracking fields
  entry_mode?: 'manual' | 'ai_scan';
  ai_confidence_score?: number | null;
  requires_review?: boolean;
}

export interface DoseLogInsert {
  scheduled_at: string;
  taken_at?: string | null;
  status?: 'pending' | 'taken' | 'missed' | 'skipped' | 'taken_late';
  timezone?: string; // D15: IANA timezone for late-detection (e.g. "America/New_York")
}

export interface RefillLogInsert {
  quantity_added: number;
}

export interface VitalityFeedInsert {
  type: 'refill_alert' | 'streak' | 'intake' | 'safety' | 'sync';
  priority?: 'high' | 'normal';
  title: string;
  subtitle?: string | null;
  medication_id?: string | null;
}

export interface EmergencyVaultUpsert {
  allergies?: string[] | null;
  blood_type?: string | null;
  conditions?: string[] | null;
  medical_contacts?: MedicalContact[];
  weight?: number | null;
  age?: number | null;
}

// Grouped dose time slot for multi-medication display
export interface DoseTimeSlot {
  doseTime: Date;
  timeDisplay: string; // "8:00 AM"
  dateDisplay: string; // "Today", "Tomorrow"
  isTodayDose: boolean;
  medications: Array<{
    medication: Medication;
    mealInfo: string | null;
    doseInfo: string;
  }>;
}

// Ritual status for Today's Rituals timeline
export type RitualStatus = 'completed' | 'missed' | 'next' | 'pending' | 'due';

// Ritual chip for display in timeline
export interface RitualChip {
  id: string; // medication.id OR medication.id_dose_N for multi-dose
  medicationId: string; // Always the medication.id (for API calls)
  doseIndex: number; // 0, 1, 2 for which dose of the day
  name: string; // medication.name or "medication.name (Dose 2)"
  doseInfo: string; // "1 dose" or "2 doses"
  timeDisplay: string; // "8:00 AM"
  scheduledTime: Date; // For sorting and status calculation
  mealInfo: string | null; // "Before meal" etc.
  status: RitualStatus; // Computed status
  isNextDose: boolean; // Highlight indicator
}

// -- Notification Preferences Types ----------------------------------------

export interface MedicationNotificationOverride {
  reminders_enabled: boolean;
  advance_minutes: number | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  dose_reminders_enabled: boolean;
  advance_reminder_minutes: number;
  snooze_enabled: boolean;
  snooze_duration_minutes: number;
  refill_alerts_enabled: boolean;
  low_stock_threshold_days: number;
  gamification_notifications_enabled: boolean;
  streak_milestones_enabled: boolean;
  tier_advancement_enabled: boolean;
  waiver_prompt_enabled: boolean;
  comeback_boost_enabled: boolean;
  system_notifications_enabled: boolean;
  medication_end_date_alerts: boolean;
  safety_alerts_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  critical_bypass_quiet: boolean;
  medication_overrides: Record<string, MedicationNotificationOverride>;
  updated_at: string;
}

export interface NotificationPreferencesUpdate {
  dose_reminders_enabled?: boolean;
  advance_reminder_minutes?: number;
  snooze_enabled?: boolean;
  snooze_duration_minutes?: number;
  refill_alerts_enabled?: boolean;
  low_stock_threshold_days?: number;
  gamification_notifications_enabled?: boolean;
  streak_milestones_enabled?: boolean;
  tier_advancement_enabled?: boolean;
  waiver_prompt_enabled?: boolean;
  comeback_boost_enabled?: boolean;
  system_notifications_enabled?: boolean;
  medication_end_date_alerts?: boolean;
  safety_alerts_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  critical_bypass_quiet?: boolean;
  medication_overrides?: Record<string, MedicationNotificationOverride | null>;
}

// -- Onboarding Types -----------------------------------------------------

export type HintId = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7';

export interface OnboardingFlags {
  onboarding_complete: boolean;
  tour_complete: boolean;
  hint_H1_shown: boolean;
  hint_H2_shown: boolean;
  hint_H3_shown: boolean;
  hint_H4_shown: boolean;
  hint_H5_shown: boolean;
  hint_H6_shown: boolean;
  hint_H7_shown: boolean;
}

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OnboardingContextType {
  // State
  isWelcomeVisible: boolean;
  isTourActive: boolean;
  tourStep: number;
  layoutReady: boolean;
  activeHint: HintId | null;
  flags: OnboardingFlags;
  isLoaded: boolean;
  targetRects: (TargetRect | null)[];
  sessionCount: number;

  // Actions
  completeWelcome: () => Promise<void>;
  advanceTour: () => void;
  skipTour: () => Promise<void>;
  completeTour: () => Promise<void>;
  reportLayoutReady: () => void;
  setTargetRect: (step: number, rect: TargetRect) => void;
  checkHint: (id: HintId, condition: boolean) => boolean;
  activateHint: (id: HintId) => void;
  dismissHint: (id: HintId) => Promise<void>;
  resetAll: () => Promise<void>;
}

// -- Refill Activity Types ------------------------------------------------

export interface RefillActivity {
  last_refill_at: string | null;
  days_since_last_refill: number | null;
  has_refilled_this_month: boolean;
}

// -- Export Types ---------------------------------------------------------

export type DateRangePreset = '7d' | '30d' | '90d' | '6mo' | 'all';

export type ReportType = 'medication_passport';

export interface ExportState {
  loading: boolean;
  error: string | null;
}

// -- Gamification Types ---------------------------------------------------

/** GET /gamification/status -- main gamification state for the current user. */
export interface GamificationStatus {
  total_xp: number;
  current_tier: number;
  tier_name: string;
  streak_days: number;
  streak_start_date: string | null;
  waiver_badges: number;
  comeback_boost_active: boolean;
  comeback_boost_hours_left: number | null;
  comeback_boost_until: string | null; // BP-018: ISO datetime for frontend countdown
  xp_to_next_tier: number | null; // null when at max tier (Sage)
  next_tier_name: string | null;
  has_missed_yesterday: boolean;
  perfect_months_streak: number;
  timezone_missing: boolean; // D16: true when user.timezone is null
}

/** One tier in the journey response. */
export interface TierInfo {
  tier: number;
  name: string;
  xp_threshold: number;
  feature_unlock: string | null;
  is_unlocked: boolean;
  is_current: boolean;
  xp_to_unlock: number | null; // null if already unlocked
}

/** GET /gamification/journey -- the 5-tier progression path. */
export interface TierJourneyResponse {
  tiers: TierInfo[];
  current_tier: number;
  total_xp: number;
}

/** One XP event in the history response. */
export interface XpEvent {
  id: string;
  event_type: string;
  event_date: string | null;
  points: number;
  created_at: string;
}

/** GET /gamification/history -- paginated XP event history. */
export interface XpHistoryResponse {
  events: XpEvent[];
  total: number;
  skip: number;
  limit: number;
}

/** One milestone tier in the milestones response. */
export interface MilestoneInfo {
  name: string;
  required_months: number;
  xp_reward: number;
  current_streak: number;
  is_achieved: boolean;
}

/** Recurring consistency bonus info (post-Devoted). */
export interface ConsistencyBonusInfo {
  xp_reward: number;
  months_until_next: number;
  next_trigger_streak: number;
  total_awarded: number;
  total_xp_earned: number;
  last_awarded_streak: number | null;
  current_streak: number;
}

/** GET /gamification/milestones -- monthly adherence milestones. */
export interface MilestonesResponse {
  milestones: MilestoneInfo[];
  perfect_months_streak: number;
  consistency_bonus: ConsistencyBonusInfo | null;
}

// --- 7-Day Adherence Card ---

/** One dose slot for a given day in the weekly adherence card. */
export interface DayAdherenceSlot {
  status: 'taken' | 'taken_late' | 'missed' | 'pending' | 'future';
}

/** Adherence data for a single calendar day (Mon–Sun). */
export interface WeekDayRecord {
  date: string;
  slots: DayAdherenceSlot[];
  taken_count: number;
  taken_late_count: number;
  missed_count: number;
  pending_count: number;
  total_scheduled: number;
  adherence_pct: number | null;
}

/** GET /adherence/weekly — current + previous week summary. */
export interface WeeklyAdherenceResponse {
  week_start: string;
  week_end: string;
  days: WeekDayRecord[];
  current_week_adherence_pct: number | null;
  prev_week_adherence_pct: number | null;
  total_taken: number;
  total_taken_late: number;
  total_missed: number;
  sufficient_history: boolean;
}

// -- Adherence Calendar Types (Tier 3) ------------------------------------

export interface CalendarDoseRecord {
  medication_id: string;
  medication_name: string;
  scheduled_at: string;   // ISO datetime
  taken_at: string | null;
  status: 'taken' | 'taken_late' | 'missed' | 'pending' | 'skipped';
}

export interface DayAdherenceRecord {
  date: string;            // "2026-03-15"
  adherence_pct: number | null;  // null = no doses scheduled or future
  is_on_time_perfect: boolean;
  is_all_taken: boolean;   // true if all doses taken (on-time or late), no missed
  taken_count: number;
  taken_late_count: number;
  missed_count: number;
  total_scheduled: number;
  doses: CalendarDoseRecord[];
}

export interface MonthSummary {
  perfect_days: number;
  imperfect_days: number;
  missed_days: number;
  total_scheduled_days: number;
  has_tracking_data: boolean;
  best_streak_days: number;
  best_streak_start: string | null;
  best_streak_end: string | null;
  strongest_weekday: string | null;
  prev_month_adherence_pct: number | null;
  xp_start: number | null;
  xp_end: number | null;
  prev_month_xp_delta: number | null;
}

export interface MonthAdherenceResponse {
  year_month: string;
  days: DayAdherenceRecord[];
  month_summary: MonthSummary;
}

export interface QuickStatsResponse {
  rolling_adherence_pct: number | null;
  best_streak_days: number;
  perfect_months: number;
  total_months_this_year: number;
  milestone_label: string | null;
  milestone_progress: number;
  milestone_target: number | null;
  milestone_xp_reward: number | null;
}

// -- Weekly Milestones & Monthly Stats (Tier 4) ----------------------------

export interface WeeklyMilestone {
  weekNumber: number;
  label: string;
  milestoneName: string;
  iconName: string;
  unlocked: boolean;
  daysInWeek: number;
  perfectDaysInWeek: number;
  scheduledDaysInWeek: number;
}

export interface MonthlyStatsData {
  perfectDays: number;
  totalScheduledDays: number;
  bestStreakDays: number;
  adherencePct: number;
  motivationalMessage: string;
}

// -- Insight Trends Types (Tier 4) -----------------------------------------

export interface DayOfWeekEntry {
  day: string;       // "Sunday", "Monday", etc.
  day_index: number; // 0=Sun, 6=Sat
  date: string;      // "YYYY-MM-DD"
  adherence_pct: number;
  total: number;
  taken: number;
  taken_late: number;
  missed: number;
}

export interface TimeOfDayStats {
  total: number;
  on_time: number;
  percentage: number;
}

export interface TimeOfDayData {
  morning: TimeOfDayStats | null;
  afternoon: TimeOfDayStats | null;
  evening: TimeOfDayStats | null;
  night: TimeOfDayStats | null;
}

export interface YearlyTrendEntry {
  month: string;          // "YYYY-MM"
  adherence_pct: number;
  is_perfect_month: boolean;
}

export interface NeedsAttentionEntry {
  medication_id: string;
  medication_name: string;
  adherence_pct: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface StreakEntry {
  month: string;
  best_streak: number;
}

export interface YearlyTrendResponse {
  year: number;
  entries: YearlyTrendEntry[] | null;
  min_year: number;
  max_year: number;
}

export interface InsightTrendsResponse {
  tier_unlocked: boolean;
  day_of_week: DayOfWeekEntry[];
  time_of_day: TimeOfDayData | null;
  yearly_trend: YearlyTrendEntry[] | null;
  yearly_trend_year: number | null;
  needs_attention: NeedsAttentionEntry[] | null;
  needs_attention_overflow: number;
  streak_trajectory: StreakEntry[] | null;
}
