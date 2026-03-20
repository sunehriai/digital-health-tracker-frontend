import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type TabParamList = {
  Home: undefined;
  Cabinet: undefined;
  Insights: { fromScreen?: string } | undefined;
  Profile: undefined;
};

export type RitualPreviewParams = {
  // All medication data - saved on "Start Vitality Streak"
  name: string;
  strength: string | null;
  frequency: string;
  customDays: number[] | null; // For specific days or interval (negative = interval)
  startDate: string;
  endDate: string | null;
  isOngoing: boolean;
  timeOfDay: string;
  doseTimes: string[]; // Array of calculated dose times ["08:00", "20:00"]
  occurrence: 'once' | 'twice' | 'thrice';
  doseIntervalHours: number | null;
  mealRelation: string;
  doseSize: number;
  doseUnit: 'tablets' | 'capsules' | 'mL' | 'tsp';
  initialStock: number;
  indication: string | null;
  specialInstructions: string | null;
  allergies: string | null;
  doctorName: string | null;
  pharmacyName: string | null;
  brandName: string | null;
  isCritical: boolean;
  expiryDate: string | null;
  // AI tracking fields (optional for backwards compatibility)
  entryMode?: 'manual' | 'ai_scan';
  aiConfidenceScore?: number | null;
  requiresReview?: boolean;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  AddMedication: undefined;
  ImageUpload: undefined;
  ManualMedicationEntry: { barcode?: string; mode?: 'manual' | 'ai' };
  RitualPreview: RitualPreviewParams;
  MedicationDetails: { medicationId: string; isArchived?: boolean; alertId?: string };
  ArchivedRituals: undefined;
  EmergencyVault: undefined;
  EditEmergencyVault: undefined;
  PersonalInfo: undefined;
  PrivacySecurity: undefined;
  NotificationPrefs: undefined;
  PerMedicationNotif: undefined;
  AppPreferences: undefined;
  Appearance: undefined;
  Admin: undefined;
  MyJourney: undefined;
  MyAdherence: undefined;
  AccountSettings: undefined;
  ExportHealthData: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;
