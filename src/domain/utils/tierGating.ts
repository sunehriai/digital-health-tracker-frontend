/**
 * Tier gating utilities for feature access control.
 *
 * Gates features behind tier thresholds. Supports a "grandfather clause"
 * so users with existing data keep access even if they haven't reached
 * the required tier.
 *
 * Decision R2.6: Grandfather clause for existing vault users.
 */

/** Feature names that can be tier-gated. */
export type GatedFeature = 'custom_themes' | 'monthly_calendar' | 'insight_trends' | 'sage_wisdom';

/** Maps each gated feature to the tier number required to unlock it. */
const FEATURE_TIER_REQUIREMENTS: Record<GatedFeature, number> = {
  custom_themes: 2,     // Practitioner (500 XP)
  monthly_calendar: 3,  // Guardian (1,250 XP)
  insight_trends: 4,    // Visionary (2,500 XP)
  sage_wisdom: 5,       // Sage (5,000 XP)
};

/**
 * Checks whether a feature is unlocked for the current user.
 *
 * @param featureName - The feature to check.
 * @param currentTier - The user's current tier (1-5).
 * @param hasExistingData - Whether the user already has data for this feature
 *   (e.g., an existing emergency vault). If true, the tier gate is bypassed
 *   (grandfather clause).
 * @returns true if the user may access the feature.
 */
export function isFeatureUnlocked(
  featureName: GatedFeature,
  currentTier: number,
  hasExistingData: boolean = false,
): boolean {
  if (hasExistingData) {
    return true;
  }

  const requiredTier = FEATURE_TIER_REQUIREMENTS[featureName];
  if (requiredTier === undefined) {
    return true;
  }

  return currentTier >= requiredTier;
}

/**
 * Returns the tier number required to unlock a feature.
 */
export function getRequiredTier(featureName: GatedFeature): number {
  return FEATURE_TIER_REQUIREMENTS[featureName] ?? 1;
}
