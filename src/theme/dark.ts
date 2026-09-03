// The app's original (and still default) palette, moved here unchanged so
// it can sit alongside light.ts behind ThemeContext. See theme/light.ts for
// the counterpart and ThemeContext.tsx for how the two are selected.
export const darkColors = {
  // True OLED black, not just a dark gray -- the surface tones below stay
  // slightly lifted off it so cards/sheets still read as elevated.
  background: '#000000',
  sidebarBackground: '#000000',

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

  accent: '#FFFFFF',
  accentMuted: '#FFFFFF1F',
  onAccent: '#111111',

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

  /** Modal/overlay backdrop dimming, shared by ConversationDrawer,
   * HeaderMenu, ModelSelector, PersonaSelector, ExportImportSheet. */
  scrim: '#00000066',
};
