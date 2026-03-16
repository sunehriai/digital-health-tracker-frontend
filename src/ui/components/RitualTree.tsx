/**
 * RitualTree — Tree-of-life visual matching hand-drawn Figma reference.
 *
 * Structure: Central trunk splits into Y-branches, sub-branches have round
 * cyan fruit/node circles at tips. Roots spread organically from base.
 * Grows progressively with adherence %.
 *
 * Safety framing: Named "Ritual Tree", never "Health Tree" or "Wellness Tree".
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
  Defs,
  RadialGradient,
  Stop,
  ClipPath,
  Rect,
} from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { getTreeState, type TreeState } from '../../domain/constants/treeAssets';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RitualTreeProps {
  adherencePct: number;
  /** Number of days with delayed (imperfect) intake this month — turns some leaves orange. */
  delayedDays?: number;
  /** Number of fully missed days this month — shows fallen dry leaves on the ground. */
  missedDays?: number;
}

// ─── Palette ───────────────────────────────────────────────────────
const TRUNK      = '#7A6B52';   // warm brown bark
const TRUNK_DARK = '#5A4A35';   // darker bark for roots
const BRANCH     = '#6E5F48';   // warm brown branch strokes
const CYAN       = '#2DD4BF';   // main node color
const CYAN_DEEP  = '#0D9488';   // deeper nodes
const CYAN_LIGHT = '#5EEAD4';   // bright nodes
const CYAN_DIM   = '#1A3A38';   // unlit nodes
const CYAN_GLOW  = '#2DD4BF';
const GOLD       = '#FFD700';   // radiant sparkles
const ORANGE     = '#F59E0B';   // delayed-intake leaves
const ORANGE_DIM = '#92400E';   // darker delayed leaves
const DRY_BROWN  = '#8B6914';   // fallen dry leaves (missed)
const DRY_DARK   = '#6B4F10';   // darker fallen leaves

// ─── State config ──────────────────────────────────────────────────
const STATE_ORDER: TreeState[] = ['bare', 'sprout', 'growing', 'canopy', 'bloom'];

const STATE_LABELS: Record<TreeState, string> = {
  bare: 'Dormant',
  sprout: 'Awakening',
  growing: 'Flourishing',
  canopy: 'Thriving',
  bloom: 'Radiant',
};

const ACCENT: Record<TreeState, string> = {
  bare: '#6B7280',
  sprout: CYAN,
  growing: CYAN_LIGHT,
  canopy: CYAN,
  bloom: GOLD,
};

// ─── Tree Structure ────────────────────────────────────────────────
// All paths traced from the hand-drawn reference:
// - Trunk is center, goes up, forks into left and right main branches
// - Main branches fork into sub-branches
// - Round circles (fruits) at sub-branch tips
// - Roots curve out from trunk base

// Coordinate space: viewBox 0 0 200 260
//
// Trunk is a FILLED tapered shape: wide flared base → narrows → Y-fork at top.
// Branches are stroke paths radiating from the fork points.

// Trunk as filled shape: wide at base (flared for roots), narrows going up,
// splits into Y-fork. Left edge goes up, right edge comes back down.
// Shorter trunk: base at y=185 instead of 212
const TRUNK_FILL =
  // Start at bottom-left of flared base
  'M84 185 ' +
  // Left edge curves inward going up
  'C86 178, 89 168, 91 158 ' +
  'C93 145, 94 132, 94 122 ' +
  'C94 114, 95 108, 96 104 ' +
  // Y-fork: left branch goes up-left
  'C92 96, 82 90, 68 85 ' +
  // Tip of left fork (narrow)
  'L70 83 ' +
  // Come back to fork center (inner edge of left branch)
  'C83 88, 94 94, 98 101 ' +
  // Continue up center to top
  'C98 94, 99 86, 99 78 ' +
  // Top of trunk (narrow ~4px wide)
  'L101 78 ' +
  // Right edge comes back down
  'C101 86, 102 94, 102 101 ' +
  // Y-fork: right branch inner edge returns
  'C106 94, 117 88, 130 83 ' +
  // Tip of right fork
  'L132 85 ' +
  // Right branch outer edge back to trunk
  'C118 90, 108 96, 104 104 ' +
  'C105 108, 106 114, 106 122 ' +
  'C106 132, 107 145, 109 158 ' +
  // Right edge curves out to flared base
  'C111 168, 114 178, 116 185 ' +
  'Z';

// ─── Sub-branches (stroke paths from fork tips) ────────────────────

// Left side sub-branches (from left fork tip at ~68,85) — spread WIDER
const LEFT_SUB_1 = 'M68 85 C52 74, 32 62, 14 48';       // upper-left, far out
const LEFT_SUB_2 = 'M68 85 C54 80, 36 78, 16 80';       // horizontal-left, far out
const LEFT_SUB_3 = 'M68 85 C58 94, 42 102, 22 110';     // lower-left, angled down

// Right side sub-branches (from right fork tip at ~132,85) — spread WIDER
const RIGHT_SUB_1 = 'M132 85 C148 74, 168 62, 186 48'; // upper-right, far out
const RIGHT_SUB_2 = 'M132 85 C146 80, 164 78, 184 80'; // horizontal-right, far out
const RIGHT_SUB_3 = 'M132 85 C142 94, 158 102, 178 110'; // lower-right, angled down

// Extra mid-branches from trunk area (red-circled in feedback)
// These fill the gap between the Y-fork and the lower sub-branches
const MID_LEFT_1 = 'M94 104 C78 100, 56 92, 36 82';      // left from mid-trunk, angled up-left
const MID_LEFT_2 = 'M94 115 C76 114, 52 116, 30 120';    // left horizontal from lower trunk
const MID_LEFT_3 = 'M94 95 C80 88, 58 78, 40 68';        // left from just below fork
const MID_RIGHT_1 = 'M106 104 C122 100, 144 92, 164 82'; // right from mid-trunk
const MID_RIGHT_2 = 'M106 115 C124 114, 148 116, 170 120'; // right horizontal
const MID_RIGHT_3 = 'M106 95 C120 88, 142 78, 160 68';   // right from just below fork

// Inner fork branches — upward from fork tips toward center canopy
const INNER_LEFT = 'M68 85 C74 72, 80 58, 82 45';       // left fork → up toward center
const INNER_RIGHT = 'M132 85 C126 72, 120 58, 118 45';   // right fork → up toward center

// Top branches (from trunk top at ~100,78) — spread wider
const TOP_LEFT = 'M100 78 C88 65, 68 48, 48 35';        // top-left, wider
const TOP_RIGHT = 'M100 78 C112 65, 132 48, 152 35';    // top-right, wider
const TOP_CENTER = 'M100 78 C100 62, 100 48, 100 32';   // straight up

// Center-fill branches from trunk top — fill the empty triangle between TOP_LEFT/RIGHT and TOP_CENTER
// Asymmetric: 2 on left of center, 1 on right
const CENTER_FILL_L1 = 'M100 78 C94 66, 84 52, 72 38';   // between TOP_LEFT and TOP_CENTER
const CENTER_FILL_L2 = 'M100 78 C96 64, 90 50, 84 36';   // slightly right of L1, different angle
const CENTER_FILL_R1 = 'M100 78 C108 62, 120 48, 136 38'; // between TOP_CENTER and TOP_RIGHT

// Extra sub-branches off top branches — pushed further out
const TOP_LEFT_SUB = 'M48 35 C36 28, 22 22, 10 16';
const TOP_RIGHT_SUB = 'M152 35 C164 28, 178 22, 190 16';
const TOP_LEFT_UP = 'M48 35 C42 26, 36 18, 32 8';
const TOP_RIGHT_UP = 'M152 35 C158 26, 164 18, 168 8';

// ─── Tiny twig branches at tips of big sub-branches ──────────────
// Small forked twigs that give branch tips a natural, organic feel.

// Asymmetric twigs — different branches on left vs right for organic feel

// Left: twigs on SUB_1 (upper-left, tip 14,48) and SUB_2 (horizontal-left, tip 16,80)
const TWIG_L1_A = 'M14 48 C10 43.5, 7 39.5, 5 34.5';     // upward twig
const TWIG_L1_B = 'M14 48 C10 49.5, 5 52.5, 2 55.5';     // downward twig
const TWIG_L2_A = 'M16 80 C10 76, 6 71, 3 67';            // upward twig

// Right: twigs on SUB_2 (horizontal-right, tip 184,80) and SUB_3 (lower-right, tip 178,110)
const TWIG_R2_A = 'M184 80 C190 77, 194 73, 197 69';      // upward twig
const TWIG_R3_A = 'M178 110 C182.5 107, 187 102, 190 98';    // upward twig
const TWIG_R3_B = 'M178 110 C182.5 114.5, 187 119.5, 190 123.5'; // downward twig

// ─── Roots ─────────────────────────────────────────────────────────
// Main roots — spread more HORIZONTALLY from shorter trunk base (y=185)
const ROOT_MAIN_1 = 'M90 185 C76 190, 50 194, 24 196 C14 197, 6 196, 0 198';     // far left, very horizontal
const ROOT_MAIN_2 = 'M110 185 C124 190, 150 194, 176 196 C186 197, 194 196, 200 198'; // far right, very horizontal
const ROOT_MAIN_3 = 'M93 186 C82 192, 60 202, 38 210';     // mid-left, angled down
const ROOT_MAIN_4 = 'M107 186 C118 192, 140 202, 162 210'; // mid-right, angled down
const ROOT_MAIN_5 = 'M96 187 C88 196, 72 208, 56 218';     // inner-left, steeper
const ROOT_MAIN_6 = 'M104 187 C112 196, 128 208, 144 218'; // inner-right, steeper

// Small offshoots from main roots — point DOWNWARD, more visible
const ROOT_SHOOT_1  = 'M58 193 C50 198, 40 205, 32 212';     // off main-1 early
const ROOT_SHOOT_2  = 'M34 195 C26 200, 18 208, 10 215';     // off main-1 mid
const ROOT_SHOOT_3  = 'M14 197 C8 202, 2 208, -2 215';       // off main-1 tip
const ROOT_SHOOT_4  = 'M142 193 C150 198, 160 205, 168 212'; // off main-2 early
const ROOT_SHOOT_5  = 'M166 195 C174 200, 182 208, 190 215'; // off main-2 mid
const ROOT_SHOOT_6  = 'M186 197 C192 202, 198 208, 202 215'; // off main-2 tip
const ROOT_SHOOT_7  = 'M70 198 C62 204, 50 212, 40 220';     // off main-3
const ROOT_SHOOT_8  = 'M50 206 C42 212, 32 218, 24 225';     // off main-3 deeper
const ROOT_SHOOT_9  = 'M130 198 C138 204, 150 212, 160 220'; // off main-4
const ROOT_SHOOT_10 = 'M150 206 C158 212, 168 218, 176 225'; // off main-4 deeper
const ROOT_SHOOT_11 = 'M80 202 C72 210, 62 218, 52 225';     // off main-5
const ROOT_SHOOT_12 = 'M120 202 C128 210, 138 218, 148 225'; // off main-6
const ROOT_SHOOT_13 = 'M45 198 C38 204, 28 208, 20 214';     // extra off main-1
const ROOT_SHOOT_14 = 'M155 198 C162 204, 172 208, 180 214'; // extra off main-2

// ─── Fruit node positions ──────────────────────────────────────────
// These sit at branch tips (matching the circles in the hand sketch)

interface FruitNode {
  cx: number;
  cy: number;
  r: number;
}

// Leaves (on left/right sub-branches + new mid-branches) — BIGGER + semi-transparent
const LOWER_LEAVES: FruitNode[] = [
  { cx: 14, cy: 46, r: 14 },    // left-sub-1 tip
  { cx: 16, cy: 78, r: 12 },    // left-sub-2 tip
  { cx: 22, cy: 110, r: 11 },   // left-sub-3 tip
  { cx: 186, cy: 46, r: 14 },   // right-sub-1 tip
  { cx: 184, cy: 78, r: 12 },   // right-sub-2 tip
  { cx: 178, cy: 110, r: 11 },  // right-sub-3 tip
  // New mid-branch leaves
  { cx: 36, cy: 80, r: 12 },    // mid-left-1 tip
  { cx: 40, cy: 66, r: 11 },    // mid-left-3 tip
  { cx: 164, cy: 80, r: 12 },   // mid-right-1 tip
  { cx: 160, cy: 66, r: 11 },   // mid-right-3 tip
  { cx: 118, cy: 43, r: 12 },   // inner-right tip
];

// Upper leaves (on top branches) — DENSE top canopy crown
const UPPER_LEAVES: FruitNode[] = [
  { cx: 10, cy: 14, r: 15 },    // top-left-sub tip (far out)
  { cx: 190, cy: 14, r: 15 },   // top-right-sub tip (far out)
  { cx: 32, cy: 6, r: 14 },     // top-left-up tip
  { cx: 168, cy: 6, r: 14 },    // top-right-up tip
  { cx: 100, cy: 28, r: 18 },   // top-center (largest)
  { cx: 48, cy: 33, r: 14 },    // top-left tip
  { cx: 152, cy: 33, r: 14 },   // top-right tip
  // Dense crown fill — fills the yellow highlighted area
  { cx: 75, cy: 18, r: 16 },    // between center and left
  { cx: 125, cy: 18, r: 16 },   // between center and right
  { cx: 100, cy: 8, r: 17 },    // just above center
  { cx: 60, cy: 6, r: 14 },     // upper-left fill
  { cx: 140, cy: 6, r: 14 },    // upper-right fill
  { cx: 30, cy: 22, r: 13 },    // left bridge
  { cx: 170, cy: 22, r: 13 },   // right bridge
  { cx: 100, cy: -2, r: 15 },   // crown peak
  { cx: 75, cy: -2, r: 13 },    // left of peak
  { cx: 125, cy: -2, r: 13 },   // right of peak
  { cx: 50, cy: -2, r: 11 },    // far left peak
  { cx: 150, cy: -2, r: 11 },   // far right peak
  { cx: 88, cy: 38, r: 14 },    // inner-left below center
  { cx: 112, cy: 38, r: 14 },   // inner-right below center
];

// Extra bloom leaves (even denser canopy + more top)
const BLOOM_LEAVES: FruitNode[] = [
  { cx: 30, cy: 28, r: 13 },
  { cx: 70, cy: 22, r: 14 },
  { cx: 130, cy: 22, r: 14 },
  { cx: 170, cy: 28, r: 13 },
  { cx: 100, cy: -8, r: 16 },   // crown top
  { cx: 55, cy: 55, r: 12 },
  { cx: 145, cy: 55, r: 12 },
  { cx: 85, cy: 48, r: 13 },
  { cx: 115, cy: 48, r: 13 },
  // More crown fill
  { cx: 80, cy: 8, r: 15 },
  { cx: 120, cy: 8, r: 15 },
  { cx: 45, cy: 12, r: 13 },
  { cx: 155, cy: 12, r: 13 },
  { cx: 100, cy: -12, r: 14 },  // very top peak
  { cx: 65, cy: -6, r: 12 },
  { cx: 135, cy: -6, r: 12 },
  { cx: 100, cy: 18, r: 13 },   // mid crown fill
];

// Bloom flowers — small multi-petal shapes at branch tips (canopy + branches only, NOT roots)
interface FlowerNode {
  cx: number;
  cy: number;
  petalR: number; // radius of each petal
}

const BLOOM_FLOWERS: FlowerNode[] = [
  // Top canopy — bigger petals
  { cx: 100, cy: 28, petalR: 6 },
  { cx: 10, cy: 14, petalR: 5 },
  { cx: 190, cy: 14, petalR: 5 },
  { cx: 32, cy: 6, petalR: 4.5 },
  { cx: 168, cy: 6, petalR: 4.5 },
  { cx: 48, cy: 33, petalR: 4.5 },
  { cx: 152, cy: 33, petalR: 4.5 },
  // Mid branches
  { cx: 14, cy: 46, petalR: 4.5 },
  { cx: 186, cy: 46, petalR: 4.5 },
  { cx: 16, cy: 78, petalR: 4 },
  { cx: 184, cy: 78, petalR: 4 },
  // Inner
  { cx: 70, cy: 22, petalR: 4 },
  { cx: 130, cy: 22, petalR: 4 },
  { cx: 100, cy: 12, petalR: 5 },
];

// Golden sparkles — canopy and branches ONLY (no trunk, no roots)
const SPARKLES: FruitNode[] = [
  // Top canopy
  { cx: 100, cy: 5, r: 2.5 },
  { cx: 60, cy: 12, r: 2 },
  { cx: 140, cy: 12, r: 2 },
  { cx: 80, cy: 20, r: 1.8 },
  { cx: 120, cy: 20, r: 1.8 },
  // Outer branches
  { cx: 20, cy: 40, r: 2 },
  { cx: 180, cy: 40, r: 2 },
  { cx: 25, cy: 70, r: 1.8 },
  { cx: 175, cy: 70, r: 1.8 },
  // Mid canopy
  { cx: 45, cy: 28, r: 1.5 },
  { cx: 155, cy: 28, r: 1.5 },
  { cx: 85, cy: 35, r: 1.5 },
  { cx: 115, cy: 35, r: 1.5 },
];

// ─── Orange leaves (delayed intake) ──────────────────────────────
// These are canopy-level leaf positions that turn orange when there are delayed days.
// We pick from upper and lower leaves proportionally to delayedDays count.
const ORANGE_LEAF_POSITIONS: FruitNode[] = [
  { cx: 48, cy: 33, r: 12 },    // top-left branch tip
  { cx: 152, cy: 33, r: 12 },   // top-right branch tip
  { cx: 16, cy: 78, r: 10 },    // left-sub-2 area
  { cx: 184, cy: 78, r: 10 },   // right-sub-2 area
  { cx: 75, cy: 18, r: 11 },    // inner canopy left
  { cx: 125, cy: 18, r: 11 },   // inner canopy right
  { cx: 36, cy: 80, r: 10 },    // mid-left-1
  { cx: 164, cy: 80, r: 10 },   // mid-right-1
  { cx: 88, cy: 38, r: 10 },    // inner-left
  { cx: 112, cy: 38, r: 10 },   // inner-right
];

// ─── Fallen dry leaves (missed days) ────────────────────────────
// Scattered on the ground just above roots. Small tilted ellipses.
interface FallenLeaf {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number; // degrees
}

const FALLEN_LEAF_POSITIONS: FallenLeaf[] = [
  { cx: 70, cy: 178, rx: 6, ry: 3.5, rotation: -25 },
  { cx: 132, cy: 179, rx: 5.5, ry: 3, rotation: 30 },
  { cx: 88, cy: 181, rx: 6, ry: 3.5, rotation: 15 },
  { cx: 112, cy: 180, rx: 5, ry: 3, rotation: -35 },
  { cx: 52, cy: 180, rx: 5.5, ry: 3, rotation: 20 },
  { cx: 148, cy: 178, rx: 6, ry: 3.5, rotation: -15 },
  { cx: 78, cy: 176, rx: 5, ry: 3, rotation: 40 },
  { cx: 122, cy: 181, rx: 5.5, ry: 3.2, rotation: -20 },
  { cx: 60, cy: 182, rx: 4.5, ry: 2.8, rotation: 10 },
  { cx: 140, cy: 177, rx: 5, ry: 3, rotation: -30 },
];

// ─── Components ────────────────────────────────────────────────────

function Roots() {
  const mainRoots = [ROOT_MAIN_1, ROOT_MAIN_2, ROOT_MAIN_3, ROOT_MAIN_4, ROOT_MAIN_5, ROOT_MAIN_6];
  const shoots = [
    ROOT_SHOOT_1, ROOT_SHOOT_2, ROOT_SHOOT_3,
    ROOT_SHOOT_4, ROOT_SHOOT_5, ROOT_SHOOT_6,
    ROOT_SHOOT_7, ROOT_SHOOT_8,
    ROOT_SHOOT_9, ROOT_SHOOT_10,
    ROOT_SHOOT_11, ROOT_SHOOT_12,
    ROOT_SHOOT_13, ROOT_SHOOT_14,
  ];
  return (
    <G>
      {/* Main roots */}
      {mainRoots.map((d, i) => (
        <Path
          key={`rm${i}`}
          d={d}
          stroke={TRUNK_DARK}
          strokeWidth={i < 2 ? 3 : i < 4 ? 2.2 : 1.6}
          strokeLinecap="round"
          fill="none"
          opacity={i < 2 ? 0.8 : i < 4 ? 0.65 : 0.5}
        />
      ))}
      {/* Small offshoots — all point downward, thicker + more visible */}
      {shoots.map((d, i) => (
        <Path
          key={`rs${i}`}
          d={d}
          stroke={TRUNK_DARK}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
          opacity={0.65}
        />
      ))}
    </G>
  );
}

function TrunkShape() {
  return (
    <G>
      {/* Filled tapered trunk with Y-fork — wide at base, narrow at top */}
      <Path d={TRUNK_FILL} fill={TRUNK} />
      {/* Central highlight for bark texture */}
      <Path
        d="M98 182 C97 168, 97 148, 98 132 C98 120, 99 110, 99 101 L101 101 C101 110, 101 120, 101 132 C101 148, 101 168, 102 182 Z"
        fill="#8F7E64"
        opacity={0.3}
      />
    </G>
  );
}

function MainBranches() {
  // The Y-fork is already part of the filled trunk shape.
  // This component is now a no-op kept for stage gating compatibility.
  return null;
}

function SubBranches() {
  const forkPaths = [LEFT_SUB_1, LEFT_SUB_2, LEFT_SUB_3, RIGHT_SUB_1, RIGHT_SUB_2, RIGHT_SUB_3];
  const midPaths = [MID_LEFT_1, MID_LEFT_3, MID_RIGHT_1, MID_RIGHT_3];
  const innerPaths = [INNER_RIGHT];
  const twigPaths = [
    TWIG_L1_A, TWIG_L1_B, TWIG_L2_A,  // left: upper + horizontal branches
    TWIG_R2_A, TWIG_R3_A, TWIG_R3_B,  // right: horizontal + lower branches
  ];
  return (
    <G>
      {/* Main fork sub-branches */}
      {forkPaths.map((d, i) => (
        <Path key={`sb${i}`} d={d} stroke={BRANCH} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.85} />
      ))}
      {/* Tiny twigs at tips of big sub-branches */}
      {twigPaths.map((d, i) => (
        <Path key={`tw${i}`} d={d} stroke={BRANCH} strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.6} />
      ))}
      {/* Extra mid-trunk branches */}
      {midPaths.map((d, i) => (
        <Path key={`mb${i}`} d={d} stroke={BRANCH} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.75} />
      ))}
      {/* Inner fork branches — upward toward center canopy */}
      {innerPaths.map((d, i) => (
        <Path key={`ib${i}`} d={d} stroke={BRANCH} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.8} />
      ))}
    </G>
  );
}

function TopBranches() {
  const mainPaths = [TOP_LEFT, TOP_RIGHT, TOP_CENTER];
  const subPaths = [TOP_LEFT_SUB, TOP_RIGHT_SUB, TOP_LEFT_UP, TOP_RIGHT_UP];
  const centerFillPaths = [CENTER_FILL_L1, CENTER_FILL_L2, CENTER_FILL_R1];
  return (
    <G>
      {mainPaths.map((d, i) => (
        <Path key={`tb${i}`} d={d} stroke={TRUNK} strokeWidth={3} strokeLinecap="round" fill="none" />
      ))}
      {/* Center-fill branches — asymmetric, fill empty zone above trunk */}
      {centerFillPaths.map((d, i) => (
        <Path key={`cf${i}`} d={d} stroke={BRANCH} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.85} />
      ))}
      {subPaths.map((d, i) => (
        <Path key={`ts${i}`} d={d} stroke={BRANCH} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.8} />
      ))}
    </G>
  );
}

/** Leaf nodes — bigger circles, semi-transparent */
function LeafNodes({ leaves, lit, glow }: { leaves: FruitNode[]; lit: boolean; glow: boolean }) {
  return (
    <G>
      {leaves.map((f, i) => (
        <G key={`ln${i}`}>
          {/* Soft glow behind */}
          {glow && (
            <Circle cx={f.cx} cy={f.cy} r={f.r * 1.6} fill={CYAN_GLOW} opacity={0.08} />
          )}
          {/* Main leaf — semi-transparent */}
          <Circle
            cx={f.cx}
            cy={f.cy}
            r={f.r}
            fill={lit ? CYAN : CYAN_DIM}
            opacity={lit ? 0.4 : 0.15}
          />
          {/* Brighter inner core */}
          {lit && (
            <Circle
              cx={f.cx}
              cy={f.cy}
              r={f.r * 0.5}
              fill={CYAN_LIGHT}
              opacity={0.3}
            />
          )}
        </G>
      ))}
    </G>
  );
}

/** Bloom flowers — 5-petal shapes rendered as overlapping circles around a center */
function FlowerBlossoms({ flowers }: { flowers: FlowerNode[] }) {
  // 5 petals evenly spaced around center
  const petalAngles = [0, 72, 144, 216, 288];
  return (
    <G>
      {flowers.map((fl, i) => {
        const offset = fl.petalR * 0.8; // distance from center to petal center
        return (
          <G key={`fl${i}`}>
            {/* Petals */}
            {petalAngles.map((angle, j) => {
              const rad = (angle * Math.PI) / 180;
              const px = fl.cx + Math.cos(rad) * offset;
              const py = fl.cy + Math.sin(rad) * offset;
              return (
                <Circle
                  key={`p${j}`}
                  cx={px}
                  cy={py}
                  r={fl.petalR}
                  fill={CYAN_LIGHT}
                  opacity={0.55}
                />
              );
            })}
            {/* Center dot */}
            <Circle cx={fl.cx} cy={fl.cy} r={fl.petalR * 0.5} fill={GOLD} opacity={0.85} />
          </G>
        );
      })}
    </G>
  );
}

/** Orange leaves for delayed-intake days — overlays on top of canopy leaves */
function OrangeLeaves({ count }: { count: number }) {
  if (count <= 0) return null;
  const shown = ORANGE_LEAF_POSITIONS.slice(0, Math.min(count, ORANGE_LEAF_POSITIONS.length));
  return (
    <G>
      {shown.map((f, i) => (
        <G key={`ol${i}`}>
          <Circle cx={f.cx} cy={f.cy} r={f.r * 1.4} fill={ORANGE} opacity={0.1} />
          <Circle cx={f.cx} cy={f.cy} r={f.r} fill={ORANGE} opacity={0.5} />
          <Circle cx={f.cx} cy={f.cy} r={f.r * 0.45} fill={ORANGE_DIM} opacity={0.35} />
        </G>
      ))}
    </G>
  );
}

/** Fallen dry leaves on the ground for missed days */
function FallenLeaves({ count }: { count: number }) {
  if (count <= 0) return null;
  const shown = FALLEN_LEAF_POSITIONS.slice(0, Math.min(count, FALLEN_LEAF_POSITIONS.length));
  return (
    <G>
      {shown.map((f, i) => {
        // Build a leaf-shaped path (pointed ellipse) at origin, then translate+rotate
        const lx = f.rx;
        const ly = f.ry;
        const leafPath = `M${-lx} 0 Q${-lx * 0.3} ${-ly * 1.2}, 0 ${-ly * 0.3} Q${lx * 0.3} ${-ly * 1.2}, ${lx} 0 Q${lx * 0.3} ${ly * 1.2}, 0 ${ly * 0.3} Q${-lx * 0.3} ${ly * 1.2}, ${-lx} 0 Z`;
        return (
          <G
            key={`fallen${i}`}
            transform={`translate(${f.cx}, ${f.cy}) rotate(${f.rotation})`}
          >
            <Path
              d={leafPath}
              fill={i % 2 === 0 ? DRY_BROWN : DRY_DARK}
              opacity={0.8}
            />
            {/* Vein */}
            <Path
              d={`M${-lx * 0.6} 0 L${lx * 0.6} 0`}
              stroke={i % 2 === 0 ? DRY_DARK : DRY_BROWN}
              strokeWidth={0.6}
              opacity={0.5}
            />
          </G>
        );
      })}
    </G>
  );
}

function GoldenSparkles({ pulseAnim }: { pulseAnim: Animated.Value }) {
  return (
    <G>
      {SPARKLES.map((s, i) => (
        <AnimatedCircle
          key={`sp${i}`}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={GOLD}
          opacity={pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3 + (i % 3) * 0.12, 0.9],
          }) as unknown as number}
        />
      ))}
    </G>
  );
}

function CrownGlow({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      <Defs>
        <RadialGradient id="cGlow" cx="100" cy="50" r="70" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={CYAN_GLOW} stopOpacity="0.15" />
          <Stop offset="0.6" stopColor={CYAN_GLOW} stopOpacity="0.04" />
          <Stop offset="1" stopColor={CYAN_GLOW} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={50} r={70} fill="url(#cGlow)" />
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export default function RitualTree({ adherencePct, delayedDays = 0, missedDays = 0 }: RitualTreeProps) {
  console.log('[RitualTree] adherencePct=', adherencePct, 'delayed=', delayedDays, 'missed=', missedDays);
  const { colors } = useTheme();
  const targetState = getTreeState(adherencePct);
  const targetIdx = STATE_ORDER.indexOf(targetState);
  console.log('[RitualTree] targetState=', targetState, 'targetIdx=', targetIdx);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeStarted = useRef(false);
  const [stage, setStage] = React.useState(0);

  // Fade-in only once on mount
  useEffect(() => {
    if (fadeStarted.current) return;
    fadeStarted.current = true;
    Animated.timing(fadeIn, {
      toValue: 1, duration: 1000, useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate stage progression — re-runs when targetIdx changes (e.g., cache → fresh data)
  useEffect(() => {
    if (targetIdx === stage) return;

    // If fresh data is lower than cached stage, snap down immediately
    if (targetIdx < stage) {
      setStage(targetIdx);
      return;
    }

    // Animate upward from current stage to target
    let s = stage;
    const iv = setInterval(() => {
      s++;
      setStage(s);
      if (s >= targetIdx) clearInterval(iv);
    }, 750);
    return () => clearInterval(iv);
  }, [targetIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage >= 4) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ).start();
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const lit = stage >= 2;   // nodes light up from Growing
  const glow = stage >= 3;  // glow auras from Canopy
  const bloom = stage >= 4; // full bloom with sparkles

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Animated.View style={[styles.svgWrap, { opacity: fadeIn }]}>
        <Svg width={270} height={300} viewBox="-5 -22 210 254">
          <Defs>
            <ClipPath id="tc">
              <Rect x="-5" y="-22" width="210" height="254" />
            </ClipPath>
          </Defs>
          <G clipPath="url(#tc)">

            {/* Background glow for canopy+ */}
            <CrownGlow visible={glow} />

            {/* Roots — always visible */}
            <Roots />

            {/* Trunk (filled tapered shape with Y-fork) — always visible */}
            <TrunkShape />

            {/* Stage 1+: Main branches fork from trunk */}
            {stage >= 1 && <MainBranches />}

            {/* Stage 1+: Sub-branches off main left/right */}
            {stage >= 1 && <SubBranches />}

            {/* Stage 1+: Lower leaf nodes (dim until stage 2) */}
            {stage >= 1 && <LeafNodes leaves={LOWER_LEAVES} lit={lit} glow={glow} />}

            {/* Stage 2+: Top branches grow */}
            {stage >= 2 && <TopBranches />}

            {/* Stage 2+: Upper leaf nodes */}
            {stage >= 2 && <LeafNodes leaves={UPPER_LEAVES} lit={lit} glow={glow} />}

            {/* Stage 4 (Bloom): Extra leaves + flower blossoms + sparkles */}
            {bloom && <LeafNodes leaves={BLOOM_LEAVES} lit={true} glow={true} />}
            {bloom && <FlowerBlossoms flowers={BLOOM_FLOWERS} />}
            {bloom && <GoldenSparkles pulseAnim={pulseAnim} />}

            {/* Orange leaves for delayed-intake days (rendered on top of canopy) */}
            {stage >= 2 && delayedDays > 0 && <OrangeLeaves count={delayedDays} />}

            {/* Fallen dry leaves on ground for missed days */}
            {missedDays > 0 && <FallenLeaves count={missedDays} />}
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  svgWrap: {
    width: 270,
    height: 300,
    overflow: 'hidden',
  },
});
