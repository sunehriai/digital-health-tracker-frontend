// Database types for Vision Health Tracker — shared with web frontend

export interface Profile {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  primary_health_goal: string | null;
  primary_physician: string | null;
  vitality_streak: number;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  primary_health_goal?: string | null;
  primary_physician?: string | null;
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
  type: 'refill_alert' | 'streak' | 'intake' | 'safety' | 'sync';
  priority: 'high' | 'normal';
  title: string;
  subtitle: string | null;
  medication_id: string | null;
  is_archived: boolean;
  created_at: string;
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
export type RitualStatus = 'completed' | 'missed' | 'next' | 'pending';

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
