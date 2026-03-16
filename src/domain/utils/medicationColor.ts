/**
 * Deterministic capsule color generator based on medication name.
 * Produces consistent, visually distinct two-tone capsule colors.
 */

/** Simple string → hue hash (0–360). Deterministic for the same name. */
export function getMedicationHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

export interface CapsuleColors {
  body: string;
  cap: string;
  highlight: string;
}

/** Returns body, cap (20deg shifted + darker), and highlight colors for a capsule. */
export function getCapsuleColors(name: string): CapsuleColors {
  const hue = getMedicationHue(name);
  return {
    body: `hsl(${hue}, 65%, 50%)`,
    cap: `hsl(${(hue + 20) % 360}, 65%, 38%)`,
    highlight: 'rgba(255, 255, 255, 0.35)',
  };
}
