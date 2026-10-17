import React from 'react';
import Svg, {G, Rect} from 'react-native-svg';

/**
 * ChatGPT-style mark: six interlocking rounded loops rotated around the
 * center, on ChatGPT's brand green tile. A simplified vector evocation of
 * the OpenAI blossom -- same approach VendorLogo.tsx takes for Meta's mark,
 * not a pixel-exact reproduction of the trademark.
 */
export function ChatGPTMark({size = 44}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width={48} height={48} rx={12} fill="#10A37F" />
      <G transform="translate(24 24)">
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <Rect
            key={angle}
            x={-5}
            y={-14.5}
            width={10}
            height={17}
            rx={5}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.9}
            transform={`rotate(${angle})`}
          />
        ))}
      </G>
    </Svg>
  );
}
