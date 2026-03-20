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
export type GatedFeature = 'monthly_calendar' | 'insight_trends';

/** Maps each gated feature to the tier number required to unlock it. */
const FEATURE_TIER_REQUIREMENTS: Record<GatedFeature, number> = {
  monthly_calendar: 2,  // Practitioner (500 XP)
  // insight_trends: Tab-level access is NOT gated by this key. This key gates
  // the premium analytics cards only. Use the tier_unlocked flag from
  // GET /insights/trends to gate individual cards within InsightTrendsScreen.
  // ANTI-PATTERN: Do NOT add isFeatureUnlocked('insight_trends', ...) as a
  // LockedFeatureScreen guard in InsightTrendsScreen — it would lock the
  // entire tab for Tier 1-2 users, violating the progressive unlock design.
  insight_trends: 3,    // Guardian (1,250 XP)
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
