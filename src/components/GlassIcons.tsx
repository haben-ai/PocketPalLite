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

/** Filter/sort control -- three horizontal sliders, each with a draggable
 * knob at a different position along its track. Used for the Models
 * screen's filter/view/reset menu trigger. */
export function GlassSlidersIcon({size = SIZE}: {size?: number}) {
  const rows: [number, number][] = [
    [7, 15],
    [12, 9],
    [17, 17],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      {rows.map(([y, knobX]) => (
        <React.Fragment key={y}>
          <Rect x={3} y={y - 0.9} width={18} height={1.8} rx={0.9} fill="url(#glassFill)" opacity={0.55} />
          <Circle cx={knobX} cy={y} r={2.4} fill="url(#glassFill)" />
        </React.Fragment>
      ))}
      <Highlight cx={10} cy={7.3} rx={1.1} ry={0.6} />
    </Svg>
  );
}

/** "+" trigger for the Models screen's Add Model menu. */
export function GlassPlusIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Rect x={10.6} y={4} width={2.8} height={16} rx={1.4} fill="url(#glassFill)" />
      <Rect x={4} y={10.6} width={16} height={2.8} rx={1.4} fill="url(#glassFill)" />
      <Highlight cx={9} cy={7} rx={1.6} ry={1.1} />
    </Svg>
  );
}

/** Folder-plus, used for "Add Local Model". */
export function GlassFolderIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M3 6.5C3 5.67 3.67 5 4.5 5h4.4l2 2H19.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-15C3.67 19 3 18.33 3 17.5v-11Z"
        fill="url(#glassFill)"
      />
      <Rect x={11} y={10} width={2} height={6} rx={1} fill="#14141a" />
      <Rect x={9} y={12} width={6} height={2} rx={1} fill="#14141a" />
      <Highlight cx={8} cy={7.6} rx={2.8} ry={1} />
    </Svg>
  );
}

/** Cloud with a download arrow, used for "Add Remote Model" (paste a
 * direct download URL). */
export function GlassCloudIcon({size = SIZE}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M7.5 17C5.57 17 4 15.43 4 13.5c0-1.76 1.3-3.22 3-3.46C7.3 7.8 9.24 6.2 11.5 6.2c2.5 0 4.58 1.87 4.93 4.3H17c1.93 0 3.5 1.57 3.5 3.5S18.93 17 17 17H7.5Z"
        fill="url(#glassFill)"
      />
      <Rect x={11} y={12} width={2} height={5.5} rx={1} fill="#14141a" />
      <Path d="M9 15.2 12 18.5l3-3.3H9Z" fill="#14141a" />
      <Highlight cx={9} cy={9.4} rx={2.6} ry={1} />
    </Svg>
  );
}

/** Small trash icon for per-row delete actions. */
export function GlassTrashIcon({size = SMALL_SIZE + 2}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Rect x={5} y={7.5} width={14} height={13} rx={2} fill="url(#glassFill)" />
      <Rect x={3.5} y={5} width={17} height={2.2} rx={1.1} fill="url(#glassFill)" />
      <Rect x={9} y={2.5} width={6} height={2.4} rx={1.2} fill="url(#glassFill)" />
      <Rect x={9.5} y={10.5} width={1.8} height={7} rx={0.9} fill="#14141a" />
      <Rect x={12.7} y={10.5} width={1.8} height={7} rx={0.9} fill="#14141a" />
      <Highlight cx={8.5} cy={9.4} rx={2} ry={0.8} />
    </Svg>
  );
}

/** Small "×" glyph in a circular glass chip -- dismiss/hide actions. */
export function GlassCloseIcon({size = SMALL_SIZE + 2}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Circle cx={12} cy={12} r={9.5} fill="url(#glassFill)" />
      <Path
        d="M8.2 8.2 15.8 15.8M15.8 8.2 8.2 15.8"
        stroke="#14141a"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Highlight cx={9} cy={8.6} rx={2.6} ry={1.2} />
    </Svg>
  );
}

/** Small upward-arrow-out-of-tray glyph for the "Offload" action on the
 * currently active/loaded model. */
export function GlassOffloadIcon({size = SMALL_SIZE + 2}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <GlassDefs />
      <Path
        d="M12 15.5V4M12 4 8 8M12 4l4 4"
        stroke="url(#glassFill)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={4.5} y={17.5} width={15} height={2.6} rx={1.3} fill="url(#glassFill)" />
      <Highlight cx={9} cy={6.6} rx={1.6} ry={0.9} />
    </Svg>
  );
}
