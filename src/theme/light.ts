// Light counterpart to dark.ts, same token names, same ChatGPT-inspired
// restrained/near-monochrome approach: white/near-white flat backgrounds,
// dark text, accent stays a plain black/white inversion (no brand color).
export const lightColors = {
  background: '#FFFFFF',
  sidebarBackground: '#FEF8F3',

  // Whitish-orange surface scale -- matches the app icon's brand family
  // (was a whitish-blue tint before the orange rebrand), still light
  // enough to read as "off-white" rather than a colored panel.
  surfaceContainerLow: '#FEF8F3',
  surfaceContainer: '#FDF2EA',
  surfaceContainerHigh: '#FAE8DB',
  surfaceContainerHighest: '#F6DECD',
  surface: '#FDF2EA',
  surfaceRaised: '#FAE8DB',

  outline: '#EBD0BC',
  outlineVariant: '#FAE8DB',
  border: '#EBD0BC',

  // Pure black, not a near-black gray -- explicitly requested for light
  // mode's body text (the near-black #1A1A1A this used to be is why light
  // mode read as slightly washed-out).
  textPrimary: '#000000',
  textSecondary: '#5A5A5F',
  textMuted: '#8E8E93',

  // Brand orange -- derived from the app icon's gradient mark, lightened
  // for use as a UI accent (the icon's own orange is closer to #F97300).
  accent: '#F7863B',
  accentMuted: '#F7863B1F',
  onAccent: '#FFFFFF',

  userBubble: '#EDEDEF',
  assistantBubble: 'transparent',

  success: '#1FA971',
  danger: '#D93B3B',

  tierWeak: '#3E86C4',
  tierWeakBg: '#3E86C41A',
  tierMedium: '#B98A2E',
  tierMediumBg: '#B98A2E1A',
  tierStrong: '#1FA971',
  tierStrongBg: '#1FA9711A',

  capabilityText: '#5A5A5F',
  capabilityTextBg: '#5A5A5F14',
  capabilityVision: '#0E9488',
  capabilityVisionBg: '#0E94881A',

  scrim: '#00000066',
};
