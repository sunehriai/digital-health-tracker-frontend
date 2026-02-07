/**
 * String utilities for medication name formatting.
 */

/**
 * Common medication term abbreviations.
 */
const ABBREVIATIONS: Record<string, string> = {
  'tablet': 'Tab',
  'tablets': 'Tab',
  'capsule': 'Cap',
  'capsules': 'Cap',
  'extended release': 'ER',
  'sustained release': 'SR',
  'immediate release': 'IR',
  'controlled release': 'CR',
  'hydrochloride': 'HCl',
  'vitamin': 'Vit',
  'milligram': 'mg',
  'microgram': 'mcg',
  'injection': 'Inj',
  'solution': 'Sol',
  'suspension': 'Susp',
  'syrup': 'Syr',
  'ointment': 'Oint',
  'cream': 'Crm',
};

/**
 * Type suffixes to preserve at the end when truncating.
 */
const TYPE_SUFFIXES = ['Tab', 'Cap', 'ER', 'SR', 'IR', 'CR', 'HCl', 'Inj', 'Sol', 'Susp', 'Syr', 'Oint', 'Crm'];

/**
 * Convert a string to Title Case (first letter of each word capitalized).
 * Handles numbers and special characters gracefully.
 *
 * @param name - The string to convert
 * @returns Title cased string
 *
 * @example
 * toTitleCase("vitamin d3") // "Vitamin D3"
 * toTitleCase("omega 3 fish oil") // "Omega 3 Fish Oil"
 */
export function toTitleCase(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // Don't capitalize if it's a number or already has uppercase (like "D3", "B12")
      if (/^\d/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Apply abbreviations to a medication name.
 *
 * @param name - The medication name
 * @returns Name with common terms abbreviated
 */
function applyAbbreviations(name: string): string {
  let result = name;

  // Sort by length descending to replace longer phrases first
  const sortedAbbrevs = Object.entries(ABBREVIATIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [full, abbrev] of sortedAbbrevs) {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    result = result.replace(regex, abbrev);
  }

  return result;
}

/**
 * Extract the type suffix from a medication name if present.
 *
 * @param name - The medication name
 * @returns [nameWithoutSuffix, suffix] or [name, null]
 */
function extractTypeSuffix(name: string): [string, string | null] {
  const words = name.trim().split(' ');
  const lastWord = words[words.length - 1];

  if (TYPE_SUFFIXES.includes(lastWord)) {
    return [words.slice(0, -1).join(' '), lastWord];
  }

  return [name, null];
}

/**
 * Compress a medication name for space-constrained display.
 *
 * Strategy:
 * 1. Apply Title Case
 * 2. Apply abbreviations (Tablet → Tab, etc.)
 * 3. If still > maxLength:
 *    - Preserve type suffix at end
 *    - Truncate main name with "..."
 *
 * @param name - The medication name
 * @param maxLength - Maximum characters to display (default: 18)
 * @returns Compressed name
 *
 * @example
 * compressMedName("Dasamoolakaduthrayam Kwath Tablet", 12) // "Dasam...Tab"
 * compressMedName("Vitamin D3", 18) // "Vitamin D3"
 */
export function compressMedName(name: string, maxLength: number = 18): string {
  if (!name) return '';

  // Step 1: Apply title case
  let result = toTitleCase(name);

  // Step 2: Apply abbreviations
  result = applyAbbreviations(result);

  // If already within limit, return as-is
  if (result.length <= maxLength) {
    return result;
  }

  // Step 3: Extract type suffix to preserve it
  const [mainName, suffix] = extractTypeSuffix(result);

  if (suffix) {
    // Calculate available space for main name
    // Format: "[mainName]...[suffix]"
    const ellipsis = '...';
    const suffixPart = suffix;
    const availableForMain = maxLength - ellipsis.length - suffixPart.length;

    if (availableForMain > 3) {
      // Enough space to show meaningful part of main name
      return mainName.slice(0, availableForMain).trim() + ellipsis + suffixPart;
    } else {
      // Not enough space, just truncate with ellipsis
      return result.slice(0, maxLength - 3).trim() + '...';
    }
  } else {
    // No suffix, just truncate with ellipsis
    return result.slice(0, maxLength - 3).trim() + '...';
  }
}

/**
 * Format medication name for display in different contexts.
 *
 * @param name - The medication name
 * @param context - Display context determining max length
 * @returns Formatted name
 */
export function formatMedName(
  name: string,
  context: 'tile' | 'hero' | 'card' | 'full' = 'full'
): string {
  const maxLengths: Record<string, number> = {
    tile: 12,    // Ritual carousel tiles
    hero: 18,    // Hero section / Next Dose
    card: 18,    // Action Center, Victory Card
    full: 999,   // No compression, just title case
  };

  const maxLength = maxLengths[context] || 999;

  if (context === 'full') {
    return toTitleCase(name);
  }

  return compressMedName(name, maxLength);
}
