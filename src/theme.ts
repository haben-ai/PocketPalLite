// Purple/glow color story, matching the supplied "Chat AI" reference: a
// deep purple-to-near-black backdrop with a vivid magenta-purple accent
// used for glow effects, hero buttons, and the active/selected state.
export const colors = {
  background: '#0B0518',
  // Tonal surface scale (elevation without literal drop shadows, same
  // approach as before, recolored into the new purple family).
  surfaceContainerLow: '#140A28',
  surfaceContainer: '#1C1033',
  surfaceContainerHigh: '#2A1846',
  surfaceContainerHighest: '#35204F',
  surface: '#1C1033',
  surfaceRaised: '#2A1846',

  outline: '#3A2856',
  outlineVariant: '#2A1846',
  border: '#3A2856',

  textPrimary: '#F6F2FF',
  textSecondary: '#B6A9D6',
  textMuted: '#6E5E8F',

  accent: '#B455FF',
  accentMuted: '#B455FF26',
  onAccent: '#FFFFFF',

  userBubble: '#9A3EF2',
  assistantBubble: '#2A1846',

  success: '#3DD68C',
  danger: '#FF5C7A',

  tierWeak: '#5FB0E8',
  tierWeakBg: '#5FB0E822',
  tierMedium: '#F5B84F',
  tierMediumBg: '#F5B84F22',
  tierStrong: '#3DD68C',
  tierStrongBg: '#3DD68C22',

  // Capability badges (Text/Vision) are a distinct hue family from tier
  // badges so the two kinds of tag never get visually confused on a card.
  capabilityText: '#B6A9D6',
  capabilityTextBg: '#B6A9D61F',
  capabilityVision: '#4FD1C5',
  capabilityVisionBg: '#4FD1C522',

  // Glow ring stops, brightest at the core, fading to transparent -- used
  // with layered concentric circles to approximate a radial glow (RN's
  // built-in gradient support, via experimental_backgroundImage, is
  // linear-only).
  glowCore: '#D68CFF',
  glowMid: '#B455FF55',
  glowOuter: '#B455FF00',
};

/**
 * CSS linear-gradient strings for the native `experimental_backgroundImage`
 * View style prop (confirmed present in this project's React Native 0.76.5
 * install -- no gradient library dependency needed).
 */
export const gradients = {
  hero: 'linear-gradient(180deg, #2B1450 0%, #150A2C 55%, #0B0518 100%)',
  card: 'linear-gradient(160deg, #241238 0%, #180C2A 100%)',
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
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  title: {fontSize: 26, fontWeight: '800' as const, color: colors.textPrimary},
  heading: {fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary},
  body: {fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary},
  caption: {fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary},
  small: {fontSize: 11, fontWeight: '600' as const, color: colors.textMuted},
};

/**
 * Subtle, MD3-style elevation via shadow (Android renders these as a soft
 * drop shadow through elevation). Intentionally restrained -- one or two
 * steps, not a dramatic effect -- per "high quality, not extra flashy".
 */
export const elevation = {
  level1: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
  level2: {
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
  },
};

/** Standard durations for the Animated-based transitions across the app. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
};
