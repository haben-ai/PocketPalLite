import React from 'react';
import Svg, {Circle, Ellipse, Path} from 'react-native-svg';

/**
 * A simplified evocation of the Hugging Face mark (yellow circle, two dot
 * eyes, a small smile, two "hugging" hand shapes) -- not a pixel-exact
 * reproduction of their real logo, same approach VendorLogo.tsx already
 * uses for Meta's mark (see its own comment): recognizable at a glance
 * without guessing at bezier data from memory.
 */
export function HuggingFaceIcon({size = 24}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="20" fill="#FFD21E" />
      <Ellipse cx="16.5" cy="21" rx="2.3" ry="3" fill="#3A3A3A" />
      <Ellipse cx="31.5" cy="21" rx="2.3" ry="3" fill="#3A3A3A" />
      <Path
        d="M16 28c2.2 3 5 4.5 8 4.5s5.8-1.5 8-4.5"
        stroke="#3A3A3A"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx="10" cy="30" rx="4.5" ry="6" fill="#EDB367" transform="rotate(-25 10 30)" />
      <Ellipse cx="38" cy="30" rx="4.5" ry="6" fill="#EDB367" transform="rotate(25 38 30)" />
    </Svg>
  );
}
