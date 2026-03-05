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

/** GET /gamification/milestones -- monthly adherence milestones. */
export interface MilestonesResponse {
  milestones: MilestoneInfo[];
  perfect_months_streak: number;
}
