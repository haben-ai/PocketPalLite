import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance} from 'react-native';
import {darkColors} from './dark';
import {lightColors} from './light';
import {getAppSettings, setAppSettings, AppSettings} from '../storage/appSettings';

export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32};
export const radius = {sm: 8, md: 12, lg: 16, xl: 22, pill: 999};
/** Flat -- no elevation shadows by default, matching ChatGPT's restrained
 * surfaces. Kept as a token so call sites don't need conditionals. */
export const elevation = {level1: {}, level2: {}};
export const motion = {fast: 150, base: 220, slow: 320};

type ColorTokens = typeof darkColors;

function makeTypography(colors: ColorTokens, systemFont: string | undefined) {
  return {
    title: {fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary, fontFamily: systemFont},
    heading: {fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary, fontFamily: systemFont},
    body: {fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary, fontFamily: systemFont},
    caption: {fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary, fontFamily: systemFont},
    small: {fontSize: 11, fontWeight: '500' as const, color: colors.textMuted, fontFamily: systemFont},
  };
}

export type Theme = {
  mode: 'light' | 'dark';
  colors: ColorTokens;
  typography: ReturnType<typeof makeTypography>;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
};

function buildTheme(mode: 'light' | 'dark', systemFont: string | undefined): Theme {
  const colors = mode === 'dark' ? darkColors : lightColors;
  return {mode, colors, typography: makeTypography(colors, systemFont), spacing, radius, elevation, motion};
}

type ThemeContextValue = {
  theme: Theme;
  themeMode: AppSettings['themeMode'];
  setThemeMode: (mode: AppSettings['themeMode']) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Resolves AppSettings.themeMode ('light' | 'dark' | 'system') against the
 * OS scheme when 'system', and re-resolves live if either changes -- no
 * app restart needed to see a theme switch take effect.
 */
export function ThemeProvider({
  systemFont,
  children,
}: {
  systemFont?: string;
  children: React.ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<AppSettings['themeMode']>('system');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    getAppSettings().then(s => setThemeMode(s.themeMode));
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({colorScheme}) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const resolvedMode: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;

  const theme = useMemo(() => buildTheme(resolvedMode, systemFont), [resolvedMode, systemFont]);

  const setThemeModeAndPersist = (mode: AppSettings['themeMode']) => {
    setThemeMode(mode);
    setAppSettings({themeMode: mode});
  };

  const value = useMemo(
    () => ({theme, themeMode, setThemeMode: setThemeModeAndPersist}),
    [theme, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The live-resolved theme (light or dark, already accounting for
 * 'system'). Most components only need this. */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** Access + change the raw preference ('light' | 'dark' | 'system') --
 * used by the Settings screen's theme picker. Changing it re-renders every
 * themed screen immediately, no restart. */
export function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme()/useThemeContext() called outside of <ThemeProvider>');
  }
  return value;
}
