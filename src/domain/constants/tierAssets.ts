/**
 * Tier badge asset mapping for the gamification system.
 *
 * Each tier has a corresponding badge PNG used in:
 * - GamificationHeader (current tier badge)
 * - MyJourneyScreen (all tier badges)
 * - Tier transition celebration (new tier badge)
 *
 * Badge images sourced from project Icons/ directory.
 * Lowercase filenames follow Expo asset conventions.
 */

// Tier badge images keyed by tier number (1-5)
export const TIER_ASSETS: Record<number, any> = {
  1: require('../../../assets/tiers/observer.png'),
  2: require('../../../assets/tiers/practitioner.png'),
  3: require('../../../assets/tiers/guardian.png'),
  4: require('../../../assets/tiers/visionary.png'),
  5: require('../../../assets/tiers/sage.png'),
} as const;

// Light theme variants (where available)
export const TIER_ASSETS_LIGHT: Record<number, any> = {
  1: require('../../../assets/tiers/observer-light.png'),
  2: require('../../../assets/tiers/practitioner-light.png'),
  3: require('../../../assets/tiers/guardian-light.png'),
  4: require('../../../assets/tiers/visionary-light.png'),
  5: require('../../../assets/tiers/sage-light.png'),
} as const;

/** Get tier asset for the current theme */
export function getTierAsset(tier: number, isDark: boolean): any {
  if (!isDark && TIER_ASSETS_LIGHT[tier]) {
    return TIER_ASSETS_LIGHT[tier];
  }
  return TIER_ASSETS[tier];
}

// Waiver Badge asset ("Protector" chain-lock icon)
// Used in WaiverPrompt modal and badge count display
export const WAIVER_BADGE_ASSET = require('../../../assets/tiers/waiver-badge.png');

// Tier metadata for display purposes
// SYNC: must match vision-backend gamification_service.py TIER_NAMES and TIER_THRESHOLDS
export const TIER_NAMES: Record<number, string> = {
  1: 'Observer',
  2: 'Practitioner',
  3: 'Guardian',
  4: 'Visionary',
  5: 'Sage',
} as const;

export const TIER_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 500,
  3: 1250,
  4: 2500,
  5: 5000,
} as const;
