/**
 * Ritual Tree visual state assets and mapping logic.
 *
 * The tree grows based on monthly adherence percentage (C1 formula):
 *   adherencePct = (perfect_days + imperfect_days) / total_days * 100
 *
 * Named "Ritual Tree" — never "Health Tree" or "Wellness Tree".
 * Uses brand colors: cyan for leaves/canopy, gold for bloom.
 */

export type TreeState = 'bare' | 'sprout' | 'growing' | 'canopy' | 'bloom';

/** Maps each tree state to its PNG asset. Assets must exist before this file (C5). */
export const TREE_ASSETS: Record<TreeState, any> = {
  bare: require('../../../assets/ritual-tree/tree-bare.png'),
  sprout: require('../../../assets/ritual-tree/tree-sprout.png'),
  growing: require('../../../assets/ritual-tree/tree-growing.png'),
  canopy: require('../../../assets/ritual-tree/tree-canopy.png'),
  bloom: require('../../../assets/ritual-tree/tree-bloom.png'),
};

/**
 * Maps an adherence percentage (0-100) to one of 5 tree visual states.
 *
 * Thresholds:
 *   0-25%  → bare   (brown trunk with soil, no leaves)
 *   26-50% → sprout (small branches, few pale leaves)
 *   51-75% → growing (half canopy, moderate foliage)
 *   76-95% → canopy (dense vibrant foliage, branches extended)
 *   96-100% → bloom (full canopy + golden glow + flowers/sparkles)
 */
export function getTreeState(adherencePct: number): TreeState {
  if (adherencePct <= 25) return 'bare';
  if (adherencePct <= 50) return 'sprout';
  if (adherencePct <= 75) return 'growing';
  if (adherencePct <= 95) return 'canopy';
  return 'bloom';
}
