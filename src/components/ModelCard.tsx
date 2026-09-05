import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {DeviceTier, DownloadedModel, ModelCapability, ModelTier} from '../types';
import {getModelCompatibility, estimatePerformance} from '../services/deviceAnalyzer';
import {Card} from './Card';
import {Chip, CapabilityBadge} from './Badge';
import {PrimaryButton} from './PrimaryButton';
import {ModelCompatibilityBadge} from './ModelCompatibilityBadge';
import {NeuralDownloadProgress} from './NeuralDownloadProgress';
import {GearIcon, OffloadIcon, CloseIcon, TrashIcon} from './Icons';
import {BlinkingDot} from './BlinkingDot';

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
};

function formatSize(bytes: number): string {
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
  downloadState?: {fraction: number; cancel: () => void};
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

  const compatibility =
    device && model.minRamGB !== undefined
      ? getModelCompatibility({minRamGB: model.minRamGB, sizeBytes: model.sizeBytes}, device)
      : undefined;
  const performance =
    device && model.params ? estimatePerformance({params: model.params}, device.tier) : undefined;

  const totalGB = model.sizeBytes / 1e9;
  const storageLow = !downloadedEntry && !!device && totalGB > device.freeStorageGB;

  return (
    <Card
      style={[styles.card, isActive && {borderColor: colors.success}]}
      highlighted={highlighted}>
      <View style={styles.headerRow}>
        <Text style={styles.typeIcon}>{model.capability === 'vision' ? '👁' : '💬'}</Text>
        <Text style={[typography.heading, styles.name]} numberOfLines={1}>
          {model.name}
        </Text>
        <Text style={[typography.small, {color: colors.textMuted}]}>{formatSize(model.sizeBytes)}</Text>
        {downloadedEntry && <BlinkingDot color={isActive ? colors.success : colors.danger} />}
      </View>

      {model.description && (
        <Text style={[typography.caption, styles.description]}>{model.description}</Text>
      )}

      {storageLow && (
        <Text style={[typography.small, styles.storageWarning, {color: colors.danger}]}>
          Storage low! Model {totalGB.toFixed(2)} GB &gt; {device!.freeStorageGB.toFixed(2)} GB free
        </Text>
      )}

      {detailsOpen && (
        <View style={styles.detailsRow}>
          {compatibility && <ModelCompatibilityBadge compatibility={compatibility} />}
          {performance !== undefined && <Chip label={`⚡ ~${performance} tok/s`} />}
          {model.capability && <CapabilityBadge capability={model.capability} compact />}
          {model.params && <Chip label={model.params} />}
          {model.quant && <Chip label={model.quant} />}
          {model.minRamGB !== undefined && <Chip label={`Min ${model.minRamGB} GB RAM`} />}
        </View>
      )}

      {downloadState ? (
        <NeuralDownloadProgress fraction={downloadState.fraction} onCancel={downloadState.cancel} />
      ) : (
        <View style={styles.actionRow}>
          {downloadedEntry ? (
            isActive && onOffload ? (
              <TouchableOpacity
                style={[styles.offloadButton, {borderColor: colors.success}]}
                onPress={onOffload}
                activeOpacity={0.8}>
                <OffloadIcon size={14} color={colors.success} />
                <Text style={[typography.body, styles.offloadLabel, {color: colors.success}]}>
                  Offload
                </Text>
              </TouchableOpacity>
            ) : (
              <PrimaryButton label="Use this model" onPress={onChat} style={styles.flexButton} />
            )
          ) : (
            <PrimaryButton
              label="Download"
              onPress={onDownload}
              disabled={storageLow}
              style={styles.flexButton}
            />
          )}

          <TouchableOpacity
            style={[styles.iconButton, {backgroundColor: colors.surfaceContainerHigh}]}
            onPress={() => setDetailsOpen(v => !v)}
            hitSlop={4}>
            <GearIcon size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {downloadedEntry ? (
            <TouchableOpacity
              style={[styles.iconButton, {backgroundColor: colors.surfaceContainerHigh}]}
              onPress={onDelete}
              hitSlop={4}>
              <TrashIcon size={16} color={colors.danger} />
            </TouchableOpacity>
          ) : onHide ? (
            <TouchableOpacity
              style={[styles.iconButton, {backgroundColor: colors.surfaceContainerHigh}]}
              onPress={onHide}
              hitSlop={4}>
              <CloseIcon size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: spacing.sm},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  typeIcon: {fontSize: 16},
  name: {flex: 1},
  description: {marginTop: 4, lineHeight: 19},
  storageWarning: {marginTop: spacing.xs, fontWeight: '600'},
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm},
  flexButton: {flex: 1},
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  offloadLabel: {fontWeight: '700'},
});
