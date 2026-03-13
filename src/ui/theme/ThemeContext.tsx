import React, { createContext, useContext, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppPreferences } from '../hooks/useAppPreferences';
import {
  type ColorPalette,
  type IconStyle,
  type CardSurfaceStyle,
  type ThemeId,
  type IconPackId,
  type LensId,
  THEME_PALETTES,
  ICON_PACKS,
  computeCardStyle,
} from './themeDefinitions';

// Re-export types for consumers
export type { ColorPalette, IconStyle, CardSurfaceStyle, ThemeId, IconPackId, LensId };

// ── Dark palette (canonical — matches THEME_PALETTES['default']) ─────────

export const darkColors: ColorPalette = THEME_PALETTES['default'];

// ── Light palette ───────────────────────────────────────────────────────

export const lightColors: ColorPalette = {
  cyan: '#0097B8',
  cyanDim: 'rgba(0, 151, 184, 0.10)',
  cyanGlow: 'rgba(0, 151, 184, 0.15)',
  secondary: '#2563EB',
  secondaryDim: 'rgba(37, 99, 235, 0.10)',
  complement: '#EA580C',
  complementDeep: '#C2410C',
  complementDim: 'rgba(234, 88, 12, 0.10)',
  chartAccent: '#EA580C',
  chartAccentDeep: '#C2410C',
  bg: '#F8F9FA',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInput: '#F0F1F3',
  bgSubtle: 'rgba(0, 0, 0, 0.03)',
  bgDark: '#F0F1F3',
  textPrimary: '#111113',
  textSecondary: '#555560',
  textMuted: '#888893',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  border: '#E2E3E7',
  borderSubtle: 'rgba(0, 0, 0, 0.08)',
  borderFocused: '#0097B8',
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayHeavy: 'rgba(0, 0, 0, 0.6)',
};

// ── Shadow helper (light theme uses shadows for card elevation) ─────────

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const lightShadow: ThemeShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

const noShadow: ThemeShadow = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

// ── AsyncStorage keys ───────────────────────────────────────────────────

const STORAGE_KEY_COLOR_THEME = '@vision_color_theme';
const STORAGE_KEY_ICON_PACK = '@vision_icon_pack';
const STORAGE_KEY_SURFACE_LENS = '@vision_surface_lens';

// ── Context ─────────────────────────────────────────────────────────────

export interface ThemeContextType {
  colors: ColorPalette;
  isDark: boolean;
  colorScheme: 'dark' | 'light';
  shadow: ThemeShadow;
  // Custom theme fields (Tier 2)
  themeId: ThemeId;
  lensId: LensId;
  iconPackId: IconPackId;
  iconStyle: IconStyle;
  cardStyle: CardSurfaceStyle;
  setTheme: (id: ThemeId) => void;
  setLens: (id: LensId) => void;
  setIconPack: (id: IconPackId) => void;
  loading: boolean;
}

const DEFAULT_CARD_STYLE = computeCardStyle('glass', darkColors);

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  isDark: true,
  colorScheme: 'dark',
  shadow: noShadow,
  themeId: 'default',
  lensId: 'glass',
  iconPackId: 'outlined',
  iconStyle: ICON_PACKS['outlined'],
  cardStyle: DEFAULT_CARD_STYLE,
  setTheme: () => {},
  setLens: () => {},
  setIconPack: () => {},
  loading: true,
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

// ── Valid key sets (for validation) ─────────────────────────────────────

const VALID_LENSES = new Set<string>(['glass', 'depth', 'minimal']);

// ── Provider ────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = useAppPreferences();

  // Custom theme state (Tier 2 feature)
  const [themeId, setThemeId] = useState<ThemeId>('default');
  const [lensId, setLensIdState] = useState<LensId>('glass');
  const [iconPackId, setIconPackId] = useState<IconPackId>('outlined');
  const [loading, setLoading] = useState(true);

  // Debounce refs for AsyncStorage writes
  const themeWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lensWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // EC-10: useColorScheme() can return null before native layer initializes.
  const systemScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'dark';

  // Load custom theme preferences from AsyncStorage on mount (single round-trip)
  useEffect(() => {
    const load = async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          STORAGE_KEY_COLOR_THEME,
          STORAGE_KEY_ICON_PACK,
          STORAGE_KEY_SURFACE_LENS,
        ]);
        const storedTheme = pairs[0][1];
        const storedPack = pairs[1][1];
        const storedLens = pairs[2][1];

        if (storedTheme && storedTheme in THEME_PALETTES) {
          setThemeId(storedTheme as ThemeId);
        }
        if (storedPack && storedPack in ICON_PACKS) {
          setIconPackId(storedPack as IconPackId);
        }
        if (storedLens && VALID_LENSES.has(storedLens)) {
          setLensIdState(storedLens as LensId);
        }
      } catch {
        console.warn('[ThemeContext] Failed to load theme preferences, using defaults');
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      if (themeWriteTimer.current) clearTimeout(themeWriteTimer.current);
      if (lensWriteTimer.current) clearTimeout(lensWriteTimer.current);
      if (iconWriteTimer.current) clearTimeout(iconWriteTimer.current);
    };
  }, []);

  // Setters: synchronous state update + debounced AsyncStorage write

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    if (themeWriteTimer.current) clearTimeout(themeWriteTimer.current);
    themeWriteTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY_COLOR_THEME, id).catch(() => {});
    }, 300);
  }, []);

  const setLens = useCallback((id: LensId) => {
    setLensIdState(id);
    if (lensWriteTimer.current) clearTimeout(lensWriteTimer.current);
    lensWriteTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY_SURFACE_LENS, id).catch(() => {});
    }, 300);
  }, []);

  const setIconPack = useCallback((id: IconPackId) => {
    setIconPackId(id);
    if (iconWriteTimer.current) clearTimeout(iconWriteTimer.current);
    iconWriteTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY_ICON_PACK, id).catch(() => {});
    }, 300);
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    let resolvedScheme: 'dark' | 'light';
    if (prefs.theme === 'system') {
      resolvedScheme = systemScheme === 'light' ? 'light' : 'dark';
    } else {
      resolvedScheme = prefs.theme === 'light' ? 'light' : 'dark';
    }

    const isDark = resolvedScheme === 'dark';
    const colors = isDark ? THEME_PALETTES[themeId] : lightColors;
    const cardStyle = computeCardStyle(lensId, colors);

    return {
      colors,
      isDark,
      colorScheme: resolvedScheme,
      shadow: isDark ? noShadow : lightShadow,
      themeId,
      lensId,
      iconPackId,
      iconStyle: ICON_PACKS[iconPackId],
      cardStyle,
      setTheme,
      setLens,
      setIconPack,
      loading,
    };
  }, [prefs.theme, systemScheme, themeId, lensId, iconPackId, setTheme, setLens, setIconPack, loading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
