/**
 * Screen security classification registry.
 * Maps route names to security levels for screenshot/recording prevention.
 */

export type SecurityLevel = 'critical' | 'high' | 'medium';

export const SCREEN_SECURITY_REGISTRY: Record<string, SecurityLevel> = {
  // Critical — contains most sensitive PHI
  EmergencyVault: 'critical',
  EditEmergencyVault: 'critical',

  // High — contains identifiable health data
  PersonalInfo: 'high',
  MedicationDetails: 'high',
  ExportHealthData: 'high',
  ManualMedicationEntry: 'high',
  ImageUpload: 'high',

  // Medium — contains health-related summaries
  Home: 'medium',
  Cabinet: 'medium',
  Alerts: 'medium',
  RitualPreview: 'medium',
} as const;

/** Critical + High screens — protected in "sensitive_only" mode */
export const SENSITIVE_SCREENS = new Set<string>(
  Object.entries(SCREEN_SECURITY_REGISTRY)
    .filter(([, level]) => level === 'critical' || level === 'high')
    .map(([name]) => name),
);

/** All classified screens — protected in "all" mode */
export const ALL_PROTECTED_SCREENS = new Set<string>(
  Object.keys(SCREEN_SECURITY_REGISTRY),
);
