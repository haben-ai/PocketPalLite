// Noto Sans, bundled as a variable font (android/app/src/main/assets/fonts/
// NotoSans.ttf, registered for iOS via Info.plist's UIAppFonts -- the iOS
// Xcode target itself still needs the Fonts folder added as a build
// resource before this takes effect there; untested on iOS since this
// project has only ever been built/run on Android in this environment).
// Referencing it by filename (no extension) is Android's font-linking
// convention; if the font isn't actually available (e.g. iOS before the
// Xcode step), RN silently falls back to the system font rather than
// crashing, so this is safe to set unconditionally on both platforms.
const systemFont = 'NotoSans';
/** JetBrains Mono, for code blocks only -- see ChatBubble's fenced-code
 * rendering, the only place this is used. */
const monoFont = 'JetBrainsMono-Regular';
const monoFontBold = 'JetBrainsMono-Bold';

// ChatGPT-inspired monochrome dark theme: near-black flat backgrounds,
// minimal color. Accent color is reserved for meaningful functional states
// (model compatibility badges, errors) rather than brand decoration --
// primary actions use a plain white-on-dark inversion (e.g. the send
// button), matching ChatGPT's own restrained, colorless chrome.
export const colors = {
  // True OLED black, not just a dark gray -- the surface tones below stay
  // slightly lifted off it so cards/sheets still read as elevated.
  background: '#000000',
  sidebarBackground: '#000000',

  // Tonal surface scale (elevation without literal drop shadows).
  surfaceContainerLow: '#0D0D0D',
  surfaceContainer: '#1A1A1A',
  surfaceContainerHigh: '#232323',
  surfaceContainerHighest: '#2E2E2E',
  surface: '#1A1A1A',
  surfaceRaised: '#232323',

  outline: '#2E2E2E',
  outlineVariant: '#1F1F1F',
  border: '#2E2E2E',

  textPrimary: '#ECECEC',
  textSecondary: '#B4B4B4',
  textMuted: '#8E8EA0',

  // No brand color -- primary actions invert (white bg / near-black text)
  // the same way ChatGPT's send button does.
  accent: '#FFFFFF',
  accentMuted: '#FFFFFF1F',
  onAccent: '#111111',

  // Assistant messages have no bubble at all (plain text on background),
  // matching ChatGPT; only user messages get a subtle filled bubble.
  userBubble: '#2F2F2F',
  assistantBubble: 'transparent',

  success: '#3DD68C',
  danger: '#F65C5C',

  tierWeak: '#6FB3E8',
  tierWeakBg: '#6FB3E822',
  tierMedium: '#E8B84F',
  tierMediumBg: '#E8B84F22',
  tierStrong: '#3DD68C',
  tierStrongBg: '#3DD68C22',

  capabilityText: '#B4B4B4',
  capabilityTextBg: '#B4B4B41F',
  capabilityVision: '#4FD1C5',
  capabilityVisionBg: '#4FD1C522',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  title: {fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary, fontFamily: systemFont},
  heading: {fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary, fontFamily: systemFont},
  body: {fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary, fontFamily: systemFont},
  caption: {fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary, fontFamily: systemFont},
  small: {fontSize: 11, fontWeight: '500' as const, color: colors.textMuted, fontFamily: systemFont},
  /** Code blocks only -- JetBrains Mono, not the UI's Noto Sans. */
  code: {fontSize: 13, fontWeight: '400' as const, color: colors.textPrimary, fontFamily: monoFont},
  codeBold: {fontSize: 13, fontWeight: '700' as const, color: colors.textPrimary, fontFamily: monoFontBold},
};

/**
 * Flat -- no elevation shadows or borders by default, matching ChatGPT's
 * restrained, mostly-flat surfaces. Kept as a token (rather than deleted)
 * so call sites don't need per-component conditionals.
 */
export const elevation = {
  level1: {},
  level2: {},
};

/** Standard durations for the Animated-based transitions across the app. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
};
