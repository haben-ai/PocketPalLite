import React from 'react';
import Svg, {Circle, Ellipse, Path} from 'react-native-svg';

/**
 * Free, no-account, no-cost alternative to a commissioned illustrated
 * avatar set (see the AIPal persona picker's doc comment) -- a small,
 * parameterized flat-vector "person bust" glyph: colored background, a
 * head/shoulders silhouette, and an optional hairstyle + accessory drawn
 * from simple shape primitives (react-native-svg, already a dependency
 * elsewhere in this app -- see VendorLogo.tsx). Not photorealistic, but
 * genuinely diverse (skin tone, hairstyle, hijab, glasses, beard, age cues)
 * without generating or bundling any image assets.
 */
type HairStyle = 'dome' | 'wavy' | 'afro' | 'hijab' | 'bald';
type Accessory = 'glasses' | 'mustache' | 'beard' | 'bun' | 'ponytail';

type PersonConfig = {
  bg: string;
  skin: string;
  cloth: string;
  hair?: string;
  hairStyle: HairStyle;
  accessory?: Accessory;
};

const CONFIGS: Record<string, PersonConfig> = {
  'hijab-teal': {bg: '#E4F5F3', skin: '#E8B48C', cloth: '#2F8F82', hair: '#2F8F82', hairStyle: 'hijab'},
  'short-crop': {bg: '#EAF0FB', skin: '#F2C9A0', cloth: '#3E6FBF', hair: '#3B2E2A', hairStyle: 'dome'},
  'long-wavy': {bg: '#FDEEF0', skin: '#F6D3B4', cloth: '#C4577A', hair: '#6B4226', hairStyle: 'wavy'},
  'glasses-curly': {
    bg: '#F1EEFB',
    skin: '#8C5A3C',
    cloth: '#5B4B8A',
    hair: '#241A14',
    hairStyle: 'afro',
    accessory: 'glasses',
  },
  'silver-mustache': {
    bg: '#EFF3F6',
    skin: '#E8B48C',
    cloth: '#4A5568',
    hair: '#C7CCD1',
    hairStyle: 'dome',
    accessory: 'mustache',
  },
  'silver-bun': {
    bg: '#FBF0F0',
    skin: '#F2C9A0',
    cloth: '#8A5A6B',
    hair: '#C7CCD1',
    hairStyle: 'dome',
    accessory: 'bun',
  },
  'beard-full': {
    bg: '#EEF6F0',
    skin: '#B97A50',
    cloth: '#3D7A54',
    hair: '#2E2118',
    hairStyle: 'dome',
    accessory: 'beard',
  },
  'afro-round': {bg: '#FEF3E7', skin: '#7A4B32', cloth: '#C77B2E', hair: '#1F1712', hairStyle: 'afro'},
  'ponytail-blonde': {
    bg: '#FFF8E8',
    skin: '#F6D3B4',
    cloth: '#D9A441',
    hair: '#E8C766',
    hairStyle: 'dome',
    accessory: 'ponytail',
  },
  'hijab-rose': {bg: '#FCEEF2', skin: '#F2C9A0', cloth: '#C4577A', hair: '#C4577A', hairStyle: 'hijab'},
  'bald-glasses': {
    bg: '#EDF1F5',
    skin: '#8C5A3C',
    cloth: '#4A5568',
    hairStyle: 'bald',
    accessory: 'glasses',
  },
  'curly-red': {bg: '#FDF0EC', skin: '#F6D3B4', cloth: '#B5542E', hair: '#A6431F', hairStyle: 'afro'},
};

export const PERSON_AVATAR_IDS = Object.keys(CONFIGS);

export function PersonAvatar({id, size = 32}: {id: string; size?: number}) {
  const config = CONFIGS[id] ?? CONFIGS[PERSON_AVATAR_IDS[0]];
  const {bg, skin, cloth, hair, hairStyle, accessory} = config;
  const isHijab = hairStyle === 'hijab';

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={24} fill={bg} />

      {/* Afro/hijab render behind the face (a "halo"/hood the face sits in
          front of); dome/wavy/bald render the shoulders normally and add
          hair on top of the face circle instead. */}
      {hairStyle === 'afro' && <Circle cx={24} cy={16} r={13} fill={hair} />}
      {isHijab && <Path d="M4 48 Q4 6 24 6 Q44 6 44 48 Z" fill={hair} />}

      {!isHijab && <Path d="M2 48 Q4 30 24 30 Q44 30 46 48 Z" fill={cloth} />}

      {/* Neck + face */}
      <Path d="M20 24 L28 24 L28 30 L20 30 Z" fill={skin} />
      <Circle cx={24} cy={20} r={9} fill={skin} />

      {(hairStyle === 'dome' || hairStyle === 'wavy') && (
        <Ellipse cx={24} cy={12} rx={9.5} ry={6.5} fill={hair} />
      )}
      {hairStyle === 'wavy' && (
        <>
          <Path d="M14.5 15 Q13 25 16.5 34 L20 34 Q17.5 23 18.5 14 Z" fill={hair} />
          <Path d="M33.5 15 Q35 25 31.5 34 L28 34 Q30.5 23 29.5 14 Z" fill={hair} />
        </>
      )}

      {/* Eyes + mouth */}
      <Circle cx={20.5} cy={19} r={1.3} fill="#2B2B2B" />
      <Circle cx={27.5} cy={19} r={1.3} fill="#2B2B2B" />
      <Path d="M20.5 23.5 Q24 26 27.5 23.5" stroke="#2B2B2B" strokeWidth={1.3} fill="none" strokeLinecap="round" />

      {accessory === 'glasses' && (
        <>
          <Circle cx={20.5} cy={19} r={3.2} stroke="#33363B" strokeWidth={1.1} fill="none" />
          <Circle cx={27.5} cy={19} r={3.2} stroke="#33363B" strokeWidth={1.1} fill="none" />
          <Path d="M23.3 19 L24.7 19" stroke="#33363B" strokeWidth={1.1} />
        </>
      )}
      {accessory === 'mustache' && (
        <Path d="M20 22 Q24 23.6 28 22 Q24 23.2 20 22 Z" fill={hair} />
      )}
      {accessory === 'beard' && (
        <Path d="M16.5 22 Q16.5 30 24 30.5 Q31.5 30 31.5 22 L31.5 19 Q24 25.5 16.5 19 Z" fill={hair} />
      )}
      {accessory === 'bun' && <Circle cx={24} cy={5.5} r={3} fill={hair} />}
      {accessory === 'ponytail' && (
        <Path d="M33 13 Q39.5 15 37.5 23 Q35 19 32.5 15.5 Z" fill={hair} />
      )}
    </Svg>
  );
}
