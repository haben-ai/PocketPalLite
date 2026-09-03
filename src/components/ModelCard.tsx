import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../theme';
import {DeviceTier, DownloadedModel, ModelInfo} from '../types';
import {getModelCompatibility, estimatePerformance} from '../services/deviceAnalyzer';
import {Card} from './Card';
import {Chip} from './Badge';
import {PrimaryButton} from './PrimaryButton';
import {ModelCompatibilityBadge} from './ModelCompatibilityBadge';
import {NeuralDownloadProgress} from './NeuralDownloadProgress';

function formatSize(bytes: number): string {
  const gb = bytes / 1e9;
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  return `${Math.round(bytes / 1e6)} MB`;
}

/**
 * Plain-language-first: name, a one-line description (already
 * plain-language in the catalog), a compatibility badge, a rough speed
 * estimate, size, and one primary CTA. Exact technical facts (params,
 * quant, repo) sit behind a "Model Details" toggle instead of leading.
 */
export function ModelCard({
  model,
  downloadedEntry,
  downloadState,
  device,
  highlighted,
  onDownload,
  onChat,
  onDelete,
}: {
  model: ModelInfo;
  downloadedEntry?: DownloadedModel;
  downloadState?: {fraction: number; cancel: () => void};
  device?: DeviceTier;
  highlighted?: boolean;
  onDownload: () => void;
  onChat: () => void;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const compatibility = device ? getModelCompatibility(model, device) : undefined;
  const performance = device ? estimatePerformance(model, device.tier) : undefined;
  const totalSize = model.sizeBytes + (model.mmprojSizeBytes ?? 0);

  return (
    <Card style={styles.card} highlighted={highlighted}>
      <Text style={styles.name}>{model.name}</Text>
      <Text style={styles.description}>{model.description}</Text>

      <View style={styles.factsRow}>
        {compatibility && <ModelCompatibilityBadge compatibility={compatibility} />}
        {performance !== undefined && (
          <Chip label={`⚡ ~${performance} tok/s`} />
        )}
        <Chip label={`💾 ${formatSize(totalSize)}`} />
      </View>

      <Text style={styles.detailsToggle} onPress={() => setDetailsOpen(v => !v)}>
        {detailsOpen ? 'Hide model details ▲' : 'Model details ▾'}
      </Text>
      {detailsOpen && (
        <View style={styles.detailsRow}>
          <Chip label={model.params} />
          <Chip label={model.quant} />
          <Chip label={`Min ${model.minRamGB} GB RAM`} />
        </View>
      )}

      {downloadState ? (
        <NeuralDownloadProgress fraction={downloadState.fraction} onCancel={downloadState.cancel} />
      ) : downloadedEntry ? (
        <View style={styles.actionRow}>
          <PrimaryButton label="Use this model" onPress={onChat} style={styles.flexButton} />
          <PrimaryButton
            label="Delete"
            variant="danger"
            onPress={onDelete}
            style={styles.inlineButton}
          />
        </View>
      ) : (
        <PrimaryButton label="Download" onPress={onDownload} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: spacing.sm},
  name: {...typography.heading, marginBottom: 4},
  description: {...typography.caption, marginBottom: spacing.sm, lineHeight: 19},
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailsToggle: {
    ...typography.small,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  flexButton: {flex: 1},
  inlineButton: {paddingHorizontal: spacing.md},
});
