import React from 'react';
import Svg, {Rect, Circle, Path} from 'react-native-svg';

/**
 * A small, friendly rounded-square "blob" face -- entirely vector, no image
 * asset -- used for the onboarding pal reveal moment (see
 * data/onboardingPals.ts). Deliberately distinct from PersonAvatars.tsx's
 * human bust glyphs: once a pal is picked it becomes a real Persona (whose
 * avatarIcon *is* a PersonAvatar id, so it renders consistently everywhere
 * else in the app afterward), but onboarding itself gets its own simple,
 * mascot-style moment for introducing it.
 */
export function PalMascot({
  size = 80,
  color = '#F4B886',
  faceColor = '#2B2B2B',
}: {
  size?: number;
  color?: string;
  faceColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Rect x={0} y={0} width={80} height={80} rx={20} fill={color} />
      <Circle cx={30} cy={36} r={3.6} fill={faceColor} />
      <Circle cx={50} cy={36} r={3.6} fill={faceColor} />
      <Path d="M31 48 Q40 54 49 48" stroke={faceColor} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
