import React, { createContext, useContext, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { useAppPreferences } from '../hooks/useAppPreferences';

// ── Color palette type ──────────────────────────────────────────────────

export interface ColorPalette {
  cyan: string;
  cyanDim: string;
  cyanGlow: string;
  bg: string;
  bgCard: string;
  bgElevated: string;
  bgInput: string;
  bgSubtle: string;       // very faint tinted bg (dark: white@5%, light: black@3%)
  bgDark: string;          // darker card variant (dark: #0A0F14, light: #F0F1F3)
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  borderSubtle: string;    // faint borders (dark: white@10%, light: black@8%)
  borderFocused: string;
  overlay: string;
  overlayHeavy: string;    // strong modal overlay (dark: black@80%, light: black@60%)
}

// ── Dark palette (current — unchanged) ──────────────────────────────────

export const darkColors: ColorPalette = {
  cyan: '#00D1FF',
  cyanDim: 'rgba(0, 209, 255, 0.15)',
  cyanGlow: 'rgba(0, 209, 255, 0.3)',
  bg: '#0A0A0B',
  bgCard: '#111113',
  bgElevated: '#1A1A1D',
  bgInput: '#1E1E21',
  bgSubtle: 'rgba(255, 255, 255, 0.05)',
  bgDark: '#0A0F14',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A8',
  textMuted: '#6B6B73',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: '#2A2A2E',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',
  borderFocused: '#00D1FF',
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',
};

// ── Light palette ───────────────────────────────────────────────────────

export const lightColors: ColorPalette = {
  cyan: '#0097B8',
  cyanDim: 'rgba(0, 151, 184, 0.10)',
  cyanGlow: 'rgba(0, 151, 184, 0.15)',
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

// ── Context ─────────────────────────────────────────────────────────────

export interface ThemeContextType {
  colors: ColorPalette;
  isDark: boolean;
  colorScheme: 'dark' | 'light';
  shadow: ThemeShadow;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  isDark: true,
  colorScheme: 'dark',
  shadow: noShadow,
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

// ── Provider ────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = useAppPreferences();

  // EC-10: useColorScheme() can return null before native layer initializes.
  // Fall back to synchronous Appearance.getColorScheme() ?? 'dark'.
  const systemScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'dark';

  const value = useMemo<ThemeContextType>(() => {
    let resolvedScheme: 'dark' | 'light';

    if (prefs.theme === 'system') {
      resolvedScheme = systemScheme === 'light' ? 'light' : 'dark';
    } else {
      resolvedScheme = prefs.theme === 'light' ? 'light' : 'dark';
    }

    const isDark = resolvedScheme === 'dark';

    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      colorScheme: resolvedScheme,
      shadow: isDark ? noShadow : lightShadow,
    };
  }, [prefs.theme, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
