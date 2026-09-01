// ChatGPT-inspired monochrome dark theme: near-black flat backgrounds,
// minimal color. Accent color is reserved for meaningful functional states
// (model compatibility badges, errors) rather than brand decoration --
// primary actions use a plain white-on-dark inversion (e.g. the send
// button), matching ChatGPT's own restrained, colorless chrome.
export const colors = {
  background: '#212121',
  sidebarBackground: '#171717',

  // Tonal surface scale (elevation without literal drop shadows).
  surfaceContainerLow: '#171717',
  surfaceContainer: '#2A2A2A',
  surfaceContainerHigh: '#2F2F2F',
  surfaceContainerHighest: '#383838',
  surface: '#2A2A2A',
  surfaceRaised: '#2F2F2F',

  outline: '#3A3A3A',
  outlineVariant: '#2D2D2D',
  border: '#3A3A3A',

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
  title: {fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary},
  heading: {fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary},
  body: {fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary},
  caption: {fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary},
  small: {fontSize: 11, fontWeight: '500' as const, color: colors.textMuted},
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
