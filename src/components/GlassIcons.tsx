import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * "Glass" icon set (react-native-svg based) -- replaces the old flat
 * View/border line-icon set (Icons.tsx) with glossy, gradient-shaded glyphs
 * matching the nucleoapp.com "SVG Glass Icons" aesthetic: a dark-to-light
 * diagonal gradient fill plus a soft upper-left highlight ellipse, on a
 * 24x24 grid. Shapes are original (not traced from Nucleo's proprietary
 * artwork) -- only the glass *treatment* (gradient + highlight) is shared.
 *
 * Every icon reuses the same two gradient/highlight ids ("glassFill" /
 * "glassFillSoft"); this is safe because each icon is its own <Svg> root,
 * and SVG ids are scoped per document, not global.
 */

function GlassDefs({soft}: {soft?: boolean}) {
  return (
    <Defs>
      <LinearGradient id="glassFill" x1="15%" y1="100%" x2="85%" y2="0%">
        <Stop offset="0%" stopColor="#000000" stopOpacity={0.55} />
        <Stop offset="55%" stopColor="#9a9aa4" stopOpacity={0.95} />
        <Stop offset="100%" stopColor="#f3f3f6" />
      </LinearGradient>
      {soft && (
        <LinearGradient id="glassFillSoft" x1="15%" y1="100%" x2="85%" y2="0%">
          <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
          <Stop offset="60%" stopColor="#c3c3cb" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#ffffff" />
        </LinearGradient>
      )}
    </Defs>
  );
}

/** The glossy upper-left highlight every glass icon carries. */
function Highlight({cx, cy, rx, ry}: {cx: number; cy: number; rx: number; ry: number}) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={0.55} />;
}

const SIZE = 22;

export function GlassMenuIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Rect x={3} y={5.5} width={18} height={3} rx={1.5} fill="url(#glassFill)" />
      <Rect x={3} y={10.5} width={18} height={3} rx={1.5} fill="url(#glassFill)" />
      <Rect x={3} y={15.5} width={12} height={3} rx={1.5} fill="url(#glassFill)" />
      <Highlight cx={7} cy={7} rx={2.6} ry={1} />
    </Svg>
  );
}

export function GlassNewChatIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v7c0 1.38-1.12 2.5-2.5 2.5H9.8L6 19.2V16H6.5C5.12 16 4 14.88 4 13.5v-7Z"
        fill="url(#glassFill)"
      />
      <Rect x={11} y={7} width={2} height={6.5} rx={1} fill="#14141a" />
      <Rect x={7.75} y={9.25} width={6.5} height={2} rx={1} fill="#14141a" />
      <Highlight cx={9} cy={7.3} rx={3} ry={1.3} />
    </Svg>
  );
}

export function GlassDotsIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Circle cx={12} cy={5.5} r={2.4} fill="url(#glassFill)" />
      <Circle cx={12} cy={12} r={2.4} fill="url(#glassFill)" />
      <Circle cx={12} cy={18.5} r={2.4} fill="url(#glassFill)" />
      <Highlight cx={10.9} cy={4.3} rx={1} ry={0.55} />
      <Highlight cx={10.9} cy={10.8} rx={1} ry={0.55} />
      <Highlight cx={10.9} cy={17.3} rx={1} ry={0.55} />
    </Svg>
  );
}

export function GlassGearIcon({size = SIZE}: {size?: number}) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      {teeth.map(angle => (
        <Rect
          key={angle}
          x={10.6}
          y={1.5}
          width={2.8}
          height={5.2}
          rx={1.2}
          fill="url(#glassFill)"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <Circle cx={12} cy={12} r={6.2} fill="url(#glassFill)" />
      <Circle cx={12} cy={12} r={2.6} fill="#14141a" />
      <Highlight cx={9.6} cy={9.2} rx={2.6} ry={1.4} />
    </Svg>
  );
}

export function GlassGridIcon({size = SIZE}: {size?: number}) {
  const cells: [number, number][] = [
    [3.5, 3.5],
    [13, 3.5],
    [3.5, 13],
    [13, 13],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      {cells.map(([x, y]) => (
        <Rect key={`${x}-${y}`} x={x} y={y} width={7.5} height={7.5} rx={2.2} fill="url(#glassFill)" />
      ))}
      <Highlight cx={6.2} cy={5.6} rx={2.1} ry={1} />
    </Svg>
  );
}

export function GlassMaskIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Rect x={2.5} y={7} width={19} height={11} rx={5.5} fill="url(#glassFill)" />
      <Circle cx={8.5} cy={12.5} r={1.7} fill="#14141a" />
      <Circle cx={15.5} cy={12.5} r={1.7} fill="#14141a" />
      <Highlight cx={7} cy={9.3} rx={3} ry={1.2} />
    </Svg>
  );
}

export function GlassUploadIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path d="M12 2.5 17.5 9.5H14V15H10V9.5H6.5L12 2.5Z" fill="url(#glassFill)" />
      <Rect x={4.5} y={17} width={15} height={3} rx={1.5} fill="url(#glassFill)" />
      <Highlight cx={10.2} cy={5.5} rx={1.6} ry={1.6} />
    </Svg>
  );
}

export function GlassSparkleIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M12 2.5c.6 3.6 1.8 4.8 5.4 5.4-3.6.6-4.8 1.8-5.4 5.4-.6-3.6-1.8-4.8-5.4-5.4 3.6-.6 4.8-1.8 5.4-5.4Z"
        fill="url(#glassFill)"
      />
      <Path
        d="M17.5 14.5c.35 2 1 2.65 3 3-2 .35-2.65 1-3 3-.35-2-1-2.65-3-3 2-.35 2.65-1 3-3Z"
        fill="url(#glassFill)"
      />
      <Highlight cx={10.6} cy={5.2} rx={1.4} ry={0.9} />
    </Svg>
  );
}

/** Small (14px default) glyphs sized to sit inline next to a text label. */
const SMALL_SIZE = 14;

export function GlassCopyIcon({size = SMALL_SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Rect x={3} y={3} width={13} height={13} rx={3} fill="url(#glassFill)" />
      <Rect
        x={8}
        y={8}
        width={13}
        height={13}
        rx={3}
        fill="#1c1c22"
        stroke="url(#glassFill)"
        strokeWidth={1.4}
      />
      <Highlight cx={7} cy={5.6} rx={2.4} ry={1} />
    </Svg>
  );
}

export function GlassRegenerateIcon({size = SMALL_SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M12 4.5a7.5 7.5 0 1 1-6.5 3.75"
        fill="none"
        stroke="url(#glassFill)"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Path d="M6.5 3.5 6 9l5.2-1.7-4.7-3.8Z" fill="url(#glassFill)" />
      <Highlight cx={9.5} cy={6} rx={1.6} ry={1} />
    </Svg>
  );
}

export function GlassEditIcon({size = SMALL_SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="m15.5 3.5 5 5-11 11-6 1 1-6 11-11Z"
        fill="url(#glassFill)"
        stroke="#14141a"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <Highlight cx={14.5} cy={5.6} rx={2} ry={0.9} />
    </Svg>
  );
}
