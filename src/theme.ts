export const colors = {
  background: '#0F1117',
  surface: '#171A23',
  surfaceRaised: '#1F2330',
  border: '#2A2E3C',
  textPrimary: '#F5F6FA',
  textSecondary: '#9297AB',
  textMuted: '#5C6178',
  accent: '#7C5CFF',
  accentMuted: '#7C5CFF33',
  userBubble: '#7C5CFF',
  assistantBubble: '#1F2330',
  success: '#3DD68C',
  danger: '#FF5C7A',
  tierWeak: '#5FB0E8',
  tierWeakBg: '#5FB0E822',
  tierMedium: '#F5B84F',
  tierMediumBg: '#F5B84F22',
  tierStrong: '#3DD68C',
  tierStrongBg: '#3DD68C22',
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
  pill: 999,
};

export const typography = {
  title: {fontSize: 26, fontWeight: '800' as const, color: colors.textPrimary},
  heading: {fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary},
  body: {fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary},
  caption: {fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary},
  small: {fontSize: 11, fontWeight: '600' as const, color: colors.textMuted},
};
