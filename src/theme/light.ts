// Light counterpart to dark.ts, same token names, same ChatGPT-inspired
// restrained/near-monochrome approach: white/near-white flat backgrounds,
// dark text, accent stays a plain black/white inversion (no brand color).
export const lightColors = {
  background: '#FFFFFF',
  sidebarBackground: '#F4F8FF',

  // Whitish-blue surface scale (explicitly requested) -- replaces the
  // earlier neutral-gray card tones with a soft blue tint, still light
  // enough to read as "off-white" rather than a colored panel.
  surfaceContainerLow: '#F4F8FF',
  surfaceContainer: '#EAF2FF',
  surfaceContainerHigh: '#DCE9FC',
  surfaceContainerHighest: '#CFE0FA',
  surface: '#EAF2FF',
  surfaceRaised: '#DCE9FC',

  outline: '#C9DCF5',
  outlineVariant: '#DCE9FC',
  border: '#C9DCF5',

  // Pure black, not a near-black gray -- explicitly requested for light
  // mode's body text (the near-black #1A1A1A this used to be is why light
  // mode read as slightly washed-out).
  textPrimary: '#000000',
  textSecondary: '#5A5A5F',
  textMuted: '#8E8E93',

  // Brand blue -- explicit hex (#0081FB) requested by name, replacing the
  // earlier red rebrand.
  accent: '#0081FB',
  accentMuted: '#0081FB1F',
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
