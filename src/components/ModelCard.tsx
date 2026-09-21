import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Alert} from './AppDialog';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {DeviceTier, DownloadedModel, ModelCapability, ModelTier, ModelVendor} from '../types';
import {getModelCompatibility, estimatePerformance} from '../services/deviceAnalyzer';
import {Card} from './Card';
import {Chip, CapabilityBadge, SpecChip} from './Badge';
import {PrimaryButton} from './PrimaryButton';
import {ModelCompatibilityBadge} from './ModelCompatibilityBadge';
import {NeuralDownloadProgress} from './NeuralDownloadProgress';
import {
  ChevronDownIcon,
  CheckIcon,
  MoreIcon,
  CloseIcon,
  VisionIcon,
} from './Icons';
import {VendorLogo} from './VendorLogo';
import {BlinkingDot} from './BlinkingDot';
import {QueueItemStatus} from '../services/downloadQueue';

/** The model's at-a-glance spec pair shown as colored pills under its name
 * while it's still available to download (e.g. "Fast" / "Good quality") --
 * mirrors the reference design's per-card badge pair. The `highlighted`
 * (recommended) card gets its own slightly different weak-tier wording
 * ("Fast"/"Good quality" vs a plain weak model's "Very fast"/"Lightweight"),
 * matching how the reference distinguishes its recommended pick from a
 * merely-small one. */
export function tierSpecPair(tier: ModelTier | undefined, highlighted?: boolean): [string, string] | null {
  if (tier === 'weak') {
    return highlighted ? ['Fast', 'Good quality'] : ['Very fast', 'Lightweight'];
  }
  if (tier === 'medium') {
    return ['Balanced', 'High quality'];
  }
  if (tier === 'strong') {
    return ['Most capable', 'Best quality'];
  }
  return null;
}

/** Tints the model's icon tile by tier, purely so adjacent cards read as
 * visually distinct at a glance (the same purpose the reference design's
 * varied icon colors serve) -- vendor identity still renders inside via
 * VendorLogo, this only colors the tile behind it. */
export function tierTileColors(
  tier: ModelTier | undefined,
  colors: ReturnType<typeof useTheme>['colors'],
): {bg: string; fg: string} {
  if (tier === 'weak') {
    return {bg: colors.tierWeakBg, fg: colors.tierWeak};
  }
  if (tier === 'medium') {
    return {bg: colors.tierMediumBg, fg: colors.tierMedium};
  }
  if (tier === 'strong') {
    return {bg: colors.tierStrongBg, fg: colors.tierStrong};
  }
  return {bg: colors.surfaceContainerHigh, fg: colors.textSecondary};
}

/** Normalized shape ModelCard renders -- satisfied structurally by
 * ModelInfo (catalog models) and by a lightweight object built from
 * DownloadedModel for custom-imported / remote / Hugging-Face-sourced
 * models, which don't have tier/params/quant/description. */
export type ModelRowInfo = {
  id: string;
  name: string;
  description?: string;
  /** Total on-disk size (base model + mmproj, already summed). */
  sizeBytes: number;
  tier?: ModelTier;
  capability?: ModelCapability;
  params?: string;
  quant?: string;
  minRamGB?: number;
  vendor?: ModelVendor;
};

export function formatSize(bytes: number): string {
  if (bytes <= 0) {
    // Unknown size (e.g. a pasted "Add Remote Model" URL, before the
    // download's Content-Length has been read).
    return '';
  }
  const gb = bytes / 1e9;
  if (gb >= 1) {
    return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
  }
  return `${Math.round(bytes / 1e6)} MB`;
}

/**
 * Compact row-style model card: icon + name + size (+ a green dot when this
 * is the model currently loaded in memory) on the header line, an optional
 * one-line description, an inline low-storage warning, and an action row
 * (primary action + a details toggle + delete/hide). Compatibility/perf/
 * technical facts live behind the details toggle rather than always-on, to
 * keep the default list scannable -- full facts are one tap away, never
 * hidden entirely.
 */
export function ModelCard({
  model,
  downloadedEntry,
  downloadState,
  device,
  highlighted,
  isActive,
  onDownload,
  onChat,
  onDelete,
  onOffload,
  onHide,
}: {
  model: ModelRowInfo;
  downloadedEntry?: DownloadedModel;
  downloadState?: {
    fraction: number;
    status: QueueItemStatus;
    bytesWritten: number;
    totalBytes: number;
    queuePosition?: number;
    error?: string;
    cancel: () => void;
    retry?: () => void;
    /** Undefined for a job kind that can't pause (e.g. translation models,
     * still on the old RNFS engine). */
    pause?: () => void;
    resume?: () => void;
  };
  device?: DeviceTier;
  highlighted?: boolean;
  /** True when this is the model currently loaded into the llama.rn
   * context -- shows a green "ready" dot and swaps the primary action to
   * "Offload" (releases the context without deleting the download). */
  isActive?: boolean;
  onDownload: () => void;
  onChat: () => void;
  onDelete: () => void;
  onOffload?: () => void;
  /** Only meaningful for a not-yet-downloaded catalog row -- hides it from
   * the Models list (undoable via "Reset Models List"). */
  onHide?: () => void;
}) {
  const {colors, typography} = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const chevronRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: detailsOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [detailsOpen, chevronRotation]);

  const compatibility =
    device && model.minRamGB !== undefined
      ? getModelCompatibility({minRamGB: model.minRamGB, sizeBytes: model.sizeBytes}, device)
      : undefined;
  const performance =
    device && model.params ? estimatePerformance({params: model.params}, device.tier) : undefined;

  const totalGB = model.sizeBytes / 1e9;
  const storageLow = !downloadedEntry && !!device && totalGB > device.freeStorageGB;
  const tile = tierTileColors(model.tier, colors);
  const specPair = !downloadedEntry && !downloadState ? tierSpecPair(model.tier, highlighted) : null;
  const hasExpandableDetails = !!(model.description || compatibility || model.params);

  const handleMorePress = () => {
    const buttons: {text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void}[] = [];
    if (isActive && onOffload) {
      buttons.push({text: 'Offload from memory', onPress: onOffload});
    } else {
      buttons.push({text: 'Use this model', onPress: onChat});
    }
    buttons.push({text: 'Delete', style: 'destructive', onPress: onDelete});
    buttons.push({text: 'Cancel', style: 'cancel'});
    Alert.alert(model.name, undefined, buttons);
  };

  return (
    <Card
      style={[styles.card, isActive && {borderColor: colors.success}]}
      highlighted={highlighted}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => hasExpandableDetails && setDetailsOpen(v => !v)}
        activeOpacity={hasExpandableDetails ? 0.7 : 1}>
        <View style={[styles.avatarBadge, {backgroundColor: tile.bg}]}>
          <VendorLogo vendor={model.vendor} size={22} mutedColor={tile.fg} />
          {model.capability === 'vision' && (
            <View style={[styles.visionBadge, {backgroundColor: colors.accent, borderColor: colors.surface}]}>
              <VisionIcon size={10} color={colors.surface} />
            </View>
          )}
        </View>

        <View style={styles.nameColumn}>
          <Text style={typography.heading} numberOfLines={1}>
            {model.name}
          </Text>
          {downloadedEntry ? (
            <View style={styles.statusRow}>
              <CheckIcon size={13} color={colors.success} />
              <Text style={[typography.small, styles.statusLabel, {color: colors.success}]}>
                Downloaded
              </Text>
              {isActive && <BlinkingDot color={colors.success} />}
            </View>
          ) : (
            <Text style={[typography.small, {color: colors.textMuted}]}>
              ~ {formatSize(model.sizeBytes)}
            </Text>
          )}
        </View>

        {downloadState ? null : downloadedEntry ? (
          <TouchableOpacity
            style={[styles.moreButton, {backgroundColor: colors.surfaceContainerHigh}]}
            onPress={handleMorePress}
            hitSlop={6}>
            <MoreIcon size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.downloadSlot}>
            <PrimaryButton
              label="Download"
              onPress={onDownload}
              disabled={storageLow}
              style={styles.downloadPill}
            />
            {onHide && (
              <TouchableOpacity onPress={onHide} hitSlop={8} style={styles.hideButton}>
                <CloseIcon size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasExpandableDetails && (
          <Animated.View
            style={{
              transform: [
                {
                  rotate: chevronRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}>
            <ChevronDownIcon size={16} color={colors.textMuted} />
          </Animated.View>
        )}
      </TouchableOpacity>

      {specPair && (
        <View style={styles.specRow}>
          <SpecChip label={specPair[0]} fg={tile.fg} bg={tile.bg} />
          <SpecChip label={specPair[1]} fg={tile.fg} bg={tile.bg} />
        </View>
      )}

      {storageLow && (
        <Text style={[typography.small, styles.storageWarning, {color: colors.danger}]}>
          Storage low! Model {totalGB.toFixed(2)} GB &gt; {device!.freeStorageGB.toFixed(2)} GB free
        </Text>
      )}

      {detailsOpen && (
        <View style={styles.detailsSection}>
          {model.description && (
            <Text style={[typography.caption, styles.description]}>{model.description}</Text>
          )}
          <View style={styles.detailsRow}>
            {compatibility && <ModelCompatibilityBadge compatibility={compatibility} />}
            {performance !== undefined && <Chip label={`~${performance} tok/s`} />}
            {model.capability && <CapabilityBadge capability={model.capability} compact />}
            {model.params && <Chip label={model.params} />}
            {model.quant && <Chip label={model.quant} />}
            {model.minRamGB !== undefined && <Chip label={`Min ${model.minRamGB} GB RAM`} />}
          </View>
        </View>
      )}

      {downloadState && (
        <NeuralDownloadProgress
          fraction={downloadState.fraction}
          status={downloadState.status}
          bytesWritten={downloadState.bytesWritten}
          totalBytes={downloadState.totalBytes}
          queuePosition={downloadState.queuePosition}
          error={downloadState.error}
          onCancel={downloadState.cancel}
          onRetry={downloadState.retry}
          onPause={downloadState.pause}
          onResume={downloadState.resume}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: spacing.sm},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  avatarBadge: {
    // A rounded square (not a circle) -- matches the reference design's
    // tile-style model icons, tinted per-tier via tierTileColors rather
    // than a flat neutral background.
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  visionBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: {flex: 1, gap: 2},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  statusLabel: {fontWeight: '600'},
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadSlot: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  downloadPill: {paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill},
  hideButton: {padding: 4},
  specRow: {flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginLeft: 56},
  descriptionPreview: {marginTop: spacing.xs},
  detailsSection: {marginTop: spacing.xs},
  description: {lineHeight: 19},
  storageWarning: {marginTop: spacing.xs, fontWeight: '600', marginLeft: 56},
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
