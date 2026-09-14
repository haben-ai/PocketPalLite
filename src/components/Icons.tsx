import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import {
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronRight,
  CloudDownload,
  Copy,
  Download,
  Drama,
  EllipsisVertical,
  Eye,
  FolderPlus,
  Gauge,
  Home,
  Info,
  LayoutGrid,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash,
  Upload,
  X,
} from 'lucide-react-native';
import {PersonAvatar, PERSON_AVATAR_IDS} from './PersonAvatars';

/**
 * Lucide-style outline icon set: 24x24 grid, 2px stroke, rounded caps/
 * joins -- all defaults of the underlying `lucide-react-native` library
 * itself (see node_modules/lucide-react-native/dist/cjs/defaultAttributes.js),
 * not reimplemented here. Every icon is monochrome and takes a required
 * `color` prop (no default) so every call site is forced to pass the
 * current theme's color -- there is no "invisible on dark mode" failure
 * mode possible, since a hardcoded fallback color could silently go stale
 * against a theme it was never checked against.
 */
type IconProps = {size?: number; color: string};

const SIZE = 22;
const SMALL_SIZE = 16;

export const MenuIcon = ({size = SIZE, color}: IconProps) => <Menu size={size} color={color} />;
export const NewChatIcon = ({size = SIZE, color}: IconProps) => (
  <MessageSquarePlus size={size} color={color} />
);
export const DotsIcon = ({size = SIZE, color}: IconProps) => (
  <EllipsisVertical size={size} color={color} />
);
export const GearIcon = ({size = SIZE, color}: IconProps) => <Settings size={size} color={color} />;
export const GridIcon = ({size = SIZE, color}: IconProps) => <LayoutGrid size={size} color={color} />;
/** AIPals -- personas/characters. */
export const MaskIcon = ({size = SIZE, color}: IconProps) => <Drama size={size} color={color} />;
export const UploadIcon = ({size = SIZE, color}: IconProps) => <Upload size={size} color={color} />;
export const SparkleIcon = ({size = SIZE, color}: IconProps) => <Sparkles size={size} color={color} />;
export const CopyIcon = ({size = SMALL_SIZE, color}: IconProps) => <Copy size={size} color={color} />;
export const RegenerateIcon = ({size = SMALL_SIZE, color}: IconProps) => (
  <RotateCcw size={size} color={color} />
);
export const EditIcon = ({size = SMALL_SIZE, color}: IconProps) => <Pencil size={size} color={color} />;
export const SlidersIcon = ({size = SIZE, color}: IconProps) => (
  <SlidersHorizontal size={size} color={color} />
);
export const PlusIcon = ({size = SIZE, color}: IconProps) => <Plus size={size} color={color} />;
export const FolderIcon = ({size = SIZE, color}: IconProps) => <FolderPlus size={size} color={color} />;
export const CloudIcon = ({size = SIZE, color}: IconProps) => (
  <CloudDownload size={size} color={color} />
);
export const TrashIcon = ({size = SMALL_SIZE + 2, color}: IconProps) => (
  <Trash size={size} color={color} />
);
export const CloseIcon = ({size = SMALL_SIZE + 2, color}: IconProps) => <X size={size} color={color} />;
export const SpeedometerIcon = ({size = SIZE, color}: IconProps) => <Gauge size={size} color={color} />;
export const VisionIcon = ({size = SMALL_SIZE, color}: IconProps) => <Eye size={size} color={color} />;
export const InfoIcon = ({size = SIZE, color}: IconProps) => <Info size={size} color={color} />;
export const OffloadIcon = ({size = SMALL_SIZE + 2, color}: IconProps) => (
  <ArrowUpFromLine size={size} color={color} />
);
export const ChevronDownIcon = ({size = SIZE, color}: IconProps) => (
  <ChevronDown size={size} color={color} />
);
export const ChevronRightIcon = ({size = SIZE, color}: IconProps) => (
  <ChevronRight size={size} color={color} />
);
export const StarIcon = ({size = SMALL_SIZE, color}: IconProps) => (
  <Star size={size} color={color} fill={color} />
);
export const DownloadIcon = ({size = SIZE, color}: IconProps) => <Download size={size} color={color} />;
export const PauseIcon = ({size = SIZE, color}: IconProps) => <Pause size={size} color={color} />;
export const PlayIcon = ({size = SIZE, color}: IconProps) => <Play size={size} color={color} />;
export const ThumbsUpIcon = ({size = SMALL_SIZE, color}: IconProps) => (
  <ThumbsUp size={size} color={color} />
);
export const ThumbsDownIcon = ({size = SMALL_SIZE, color}: IconProps) => (
  <ThumbsDown size={size} color={color} />
);
export const CheckIcon = ({size = SMALL_SIZE, color}: IconProps) => <Check size={size} color={color} />;
export const HomeIcon = ({size = SIZE, color}: IconProps) => <Home size={size} color={color} />;
export const MoreIcon = ({size = SIZE, color}: IconProps) => <MoreHorizontal size={size} color={color} />;

/**
 * AIPal/persona avatars used to be abstract lucide glyphs (bot/sparkles/
 * brain/...); personas now store an id from PersonAvatars.tsx's diverse
 * flat-vector "person bust" set instead (see types.ts::Persona.avatarIcon),
 * matching a requested people-not-icons look. `color` is kept in the props
 * signature for source compatibility with every existing call site (they
 * all pass one, e.g. colors.accent for a selected state) but is unused --
 * a person avatar has its own fixed skin/hair/clothing palette, unlike a
 * single-color glyph, so there's nothing to tint. An unrecognized id (a
 * legacy lucide id like "bot" from before this change, or any bad data)
 * falls back to the first person avatar rather than rendering nothing.
 */
export const ASSISTANT_ICON_IDS = PERSON_AVATAR_IDS;

export function AssistantAvatarIcon({
  id,
  size = SIZE,
}: {
  id: string;
  size?: number;
  color?: string;
}) {
  return <PersonAvatar id={id} size={size} />;
}

/**
 * A frosted-glass circular button wrapping a single icon -- translucent
 * fill + hairline border to approximate glassmorphism without pulling in a
 * real blur dependency. Used for the header's standalone icon-only controls
 * (hamburger, new chat, overflow menu). The icon glyph itself must be
 * passed an opaque theme color (never "currentColor") so it stays visible
 * against this translucent surface in both themes.
 */
export function GlassIconButton({
  onPress,
  children,
  size = 40,
}: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      activeOpacity={0.6}
      style={[styles.glassButton, {width: size, height: size, borderRadius: size / 2}]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
