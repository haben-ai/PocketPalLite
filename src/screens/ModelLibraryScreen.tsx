import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {pick, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {colors, spacing, typography} from '../theme';
import {MODEL_CATALOG, TIER_LABEL, getModelById} from '../data/models';
import {DownloadedModel, ModelInfo, ModelTier} from '../types';
import {
  deleteDownloadedModel,
  downloadModel,
  importLocalModel,
  migrateLegacyModelIfPresent,
} from '../services/downloadManager';
import {
  getDownloadedModels,
  removeDownloadedModel,
  registerDownloadedModel,
} from '../storage/modelRegistry';
import {analyzeDevice} from '../services/deviceAnalyzer';
import {Card} from '../components/Card';
import {TierBadge, Chip} from '../components/Badge';
import {ProgressBar} from '../components/ProgressBar';
import {PrimaryButton} from '../components/PrimaryButton';

const TIERS: ModelTier[] = ['weak', 'medium', 'strong'];

function formatSize(bytes: number): string {
  const gb = bytes / 1e9;
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  return `${Math.round(bytes / 1e6)} MB`;
}

type DownloadState = {fraction: number; cancel: () => void} | undefined;

export function ModelLibraryScreen({
  onOpenModel,
}: {
  onOpenModel: (modelId: string) => void;
}) {
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>(
    {},
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    tier: ModelTier;
    modelId: string;
    ramGB: number;
  } | null>(null);
  const [customModels, setCustomModels] = useState<DownloadedModel[]>([]);

  const refresh = useCallback(async () => {
    const all = await getDownloadedModels();
    setDownloaded(all.filter(m => getModelById(m.modelId)));
    setCustomModels(all.filter(m => m.isCustomImport));
  }, []);

  useEffect(() => {
    (async () => {
      const legacy = getModelById('smollm2-135m');
      if (legacy) {
        await migrateLegacyModelIfPresent(legacy);
      }
      await refresh();
    })();
  }, [refresh]);

  const isDownloaded = (modelId: string) =>
    downloaded.some(m => m.modelId === modelId);

  const handleDownload = async (model: ModelInfo) => {
    try {
      const handle = await downloadModel(model, fraction => {
        setDownloads(prev => ({
          ...prev,
          [model.id]: {fraction, cancel: handle.cancel},
        }));
      });
      setDownloads(prev => ({
        ...prev,
        [model.id]: {fraction: 0, cancel: handle.cancel},
      }));
      await handle.completion;
      setDownloads(prev => {
        const next = {...prev};
        delete next[model.id];
        return next;
      });
      await refresh();
    } catch (err: any) {
      setDownloads(prev => {
        const next = {...prev};
        delete next[model.id];
        return next;
      });
      Alert.alert('Download failed', err.message ?? String(err));
    }
  };

  const handleDelete = async (model: DownloadedModel) => {
    Alert.alert(
      'Delete model',
      `Remove "${model.displayName}" from your device? You can download it again anytime.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDownloadedModel(model.filePath);
            await removeDownloadedModel(model.modelId);
            await refresh();
          },
        },
      ],
    );
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeDevice();
      setRecommendation({
        tier: result.tier,
        modelId: result.recommendedModelId,
        ramGB: result.totalRamGB,
      });
    } catch (err: any) {
      Alert.alert('Could not analyze device', err.message ?? String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    try {
      const [file] = await pick({type: ['application/octet-stream', '*/*']});
      if (!file?.uri) {
        return;
      }
      const name = file.name ?? 'imported-model.gguf';
      if (!name.toLowerCase().endsWith('.gguf')) {
        Alert.alert('Unsupported file', 'Please choose a .gguf model file.');
        return;
      }
      const {filePath, sizeBytes} = await importLocalModel(file.uri, name);
      const modelId = `custom-${Date.now()}`;
      await registerDownloadedModel({
        modelId,
        filePath,
        sizeBytes,
        downloadedAt: Date.now(),
        isCustomImport: true,
        displayName: name.replace(/\.gguf$/i, ''),
      });
      await refresh();
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Import failed', message);
    }
  };

  const recommendedModel = recommendation
    ? getModelById(recommendation.modelId)
    : undefined;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      <Text style={typography.title}>PocketPal</Text>
      <Text style={styles.subtitle}>
        Download a model to chat fully offline.
      </Text>

      <Card style={styles.analyzeCard}>
        <Text style={typography.heading}>Not sure which one?</Text>
        <Text style={styles.analyzeBody}>
          We'll check your phone's memory and storage, then recommend a
          model.
        </Text>
        <PrimaryButton
          label="Analyze My Phone"
          onPress={handleAnalyze}
          loading={analyzing}
          style={styles.analyzeButton}
        />
        {recommendation && recommendedModel && (
          <View style={styles.recommendationBox}>
            <TierBadge tier={recommendation.tier} />
            <Text style={styles.recommendationText}>
              Your phone has ~{recommendation.ramGB.toFixed(1)} GB RAM. We
              recommend{' '}
              <Text style={styles.recommendationModel}>
                {recommendedModel.name}
              </Text>
              .
            </Text>
          </View>
        )}
      </Card>

      {TIERS.map(tier => (
        <View key={tier} style={styles.section}>
          <Text style={styles.sectionTitle}>{TIER_LABEL[tier]}</Text>
          {MODEL_CATALOG.filter(m => m.tier === tier).map(model => (
            <Card
              key={model.id}
              style={styles.modelCard}
              highlighted={recommendation?.modelId === model.id}>
              <View style={styles.modelHeader}>
                <Text style={styles.modelName}>{model.name}</Text>
                <TierBadge tier={model.tier} />
              </View>
              <View style={styles.chipRow}>
                <Chip label={model.params} />
                <Chip label={model.quant} />
                <Chip label={formatSize(model.sizeBytes)} />
              </View>
              <Text style={styles.modelDescription}>{model.description}</Text>

              {downloads[model.id] ? (
                <View style={styles.progressRow}>
                  <ProgressBar fraction={downloads[model.id]!.fraction} />
                  <Text style={styles.progressLabel}>
                    {Math.round(downloads[model.id]!.fraction * 100)}%
                  </Text>
                  <PrimaryButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => downloads[model.id]?.cancel()}
                    style={styles.inlineButton}
                  />
                </View>
              ) : isDownloaded(model.id) ? (
                <View style={styles.actionRow}>
                  <PrimaryButton
                    label="Chat"
                    onPress={() => onOpenModel(model.id)}
                    style={styles.flexButton}
                  />
                  <PrimaryButton
                    label="Delete"
                    variant="danger"
                    onPress={() =>
                      handleDelete(
                        downloaded.find(m => m.modelId === model.id)!,
                      )
                    }
                    style={styles.inlineButton}
                  />
                </View>
              ) : (
                <PrimaryButton
                  label="Download"
                  onPress={() => handleDownload(model)}
                />
              )}
            </Card>
          ))}
        </View>
      ))}

      {customModels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imported Models</Text>
          {customModels.map(model => (
            <Card key={model.modelId} style={styles.modelCard}>
              <Text style={styles.modelName}>{model.displayName}</Text>
              <View style={styles.chipRow}>
                <Chip label={formatSize(model.sizeBytes)} />
                <Chip label="Custom import" />
              </View>
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Chat"
                  onPress={() => onOpenModel(model.modelId)}
                  style={styles.flexButton}
                />
                <PrimaryButton
                  label="Delete"
                  variant="danger"
                  onPress={() => handleDelete(model)}
                  style={styles.inlineButton}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Card style={styles.importCard}>
        <Text style={typography.heading}>Have a model already?</Text>
        <Text style={styles.analyzeBody}>
          Import any .gguf file already saved on your phone.
        </Text>
        <PrimaryButton
          label="Import Local .gguf File"
          variant="secondary"
          onPress={handleImport}
          style={styles.analyzeButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xl * 2},
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  analyzeCard: {marginBottom: spacing.lg},
  analyzeBody: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  analyzeButton: {marginTop: spacing.xs},
  recommendationBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  recommendationText: {...typography.body, color: colors.textSecondary},
  recommendationModel: {color: colors.textPrimary, fontWeight: '700'},
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  modelCard: {marginBottom: spacing.sm},
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modelName: {...typography.heading, flexShrink: 1},
  chipRow: {flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm},
  modelDescription: {
    ...typography.caption,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  progressRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  progressLabel: {...typography.small, width: 36},
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  flexButton: {flex: 1},
  inlineButton: {paddingHorizontal: spacing.md},
  importCard: {marginTop: spacing.sm},
});
