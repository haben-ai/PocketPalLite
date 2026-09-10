import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Rect} from 'react-native-svg';
import {useTheme} from '../theme/ThemeContext';

const SIZE = 220;

/**
 * Onboarding-only hero illustration: a hand-drawn phone silhouette (screen
 * + a few "chat bubble" bars, camera dot, home indicator) sitting inside a
 * soft rotated blob, with a page-specific lucide icon badge overlapping its
 * bottom-right corner. Uses the live theme's own surface/outline tokens for
 * the phone (so it reads correctly in both light and dark mode) plus one
 * page-specific accent color for the blob/badge/sparkles -- the only place
 * in the app that steps outside the otherwise-monochrome theme, since a
 * first-run welcome flow is exactly where a small deliberate splash of
 * color earns its keep.
 */
export function OnboardingHero({
  icon: Icon,
  accent,
}: {
  // See OnboardingScreen.tsx's Panel type for why this is `any` rather than
  // a {size,color} ComponentType -- lucide's generated components don't
  // structurally match that shape at the type level, only at the call site.
  icon: React.ComponentType<any>;
  accent: string;
}) {
  const {colors} = useTheme();

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Soft rotated blob background, plus a couple of loose sparkle dots
            for movement -- gives the phone something to sit inside instead
            of floating on bare background. */}
        <Rect
          x={15}
          y={15}
          width={190}
          height={190}
          rx={52}
          fill={accent}
          opacity={0.12}
          transform="rotate(-6 110 110)"
        />
        <Circle cx={172} cy={54} r={22} fill={accent} opacity={0.16} />
        <Circle cx={38} cy={168} r={13} fill={accent} opacity={0.18} />
        <Circle cx={188} cy={150} r={6} fill={accent} opacity={0.4} />
        <Circle cx={30} cy={58} r={5} fill={accent} opacity={0.3} />

        {/* Phone body + screen. */}
        <Rect
          x={70}
          y={34}
          width={80}
          height={152}
          rx={18}
          fill={colors.surface}
          stroke={colors.outline}
          strokeWidth={2}
        />
        <Circle cx={110} cy={46} r={3} fill={colors.outline} />
        <Rect x={76} y={56} width={68} height={108} rx={10} fill={colors.surfaceContainer} />

        {/* A few "chat bubble" bars inside the screen -- ties the
            illustration back to what this app actually is, rather than a
            generic phone glyph. */}
        <Rect x={86} y={70} width={34} height={8} rx={4} fill={colors.surfaceContainerHigh} />
        <Rect x={86} y={84} width={48} height={8} rx={4} fill={accent} opacity={0.4} />
        <Rect x={86} y={98} width={26} height={8} rx={4} fill={colors.surfaceContainerHigh} />
        <Rect x={86} y={112} width={40} height={8} rx={4} fill={accent} opacity={0.4} />

        <Rect x={98} y={172} width={24} height={4} rx={2} fill={colors.outline} />
      </Svg>

      <View style={[styles.badge, {backgroundColor: accent, borderColor: colors.background}]}>
        <Icon size={28} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'},
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
