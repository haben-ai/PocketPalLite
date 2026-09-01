import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {pick, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {colors, spacing, typography} from '../theme';
import {RootTabParamList} from '../navigation/types';
import {MODEL_CATALOG, TIER_LABEL, getModelById} from '../data/models';
import {DeviceTier, DownloadedModel, ModelInfo, ModelTier} from '../types';
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
import {AIPalScaffold} from '../components/AIPalScaffold';
import {ModelCard} from '../components/ModelCard';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {LoadingState} from '../components/LoadingState';

const TIERS: ModelTier[] = ['weak', 'medium', 'strong'];

type DownloadState = {fraction: number; cancel: () => void} | undefined;

type Props = BottomTabScreenProps<RootTabParamList, 'Models'>;

export function ModelsTabScreen({navigation, route}: Props) {
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [customModels, setCustomModels] = useState<DownloadedModel[]>([]);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [device, setDevice] = useState<DeviceTier | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    const all = await getDownloadedModels();
    setDownloaded(all.filter(m => getModelById(m.modelId)));
    setCustomModels(all.filter(m => m.isCustomImport));
  }, []);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      setDevice(await analyzeDevice());
    } catch (err: any) {
      Alert.alert('Could not analyze device', err.message ?? String(err));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const legacy = getModelById('smollm2-135m');
      if (legacy) {
        await migrateLegacyModelIfPresent(legacy);
      }
      // Recommended-for-your-device is a standing section now, not a
      // button the user has to think to tap -- runs once automatically
      // (the device snapshot doesn't need to re-run every focus; a manual
      // "Re-analyze" button covers the case where it goes stale).
      await handleAnalyze();
    })();
  }, [handleAnalyze]);

  // Bottom-tab screens stay mounted across tab switches, so a plain
  // mount-only effect would go stale the moment a model is
  // downloaded/deleted from elsewhere (e.g. Settings' storage list) --
  // re-fetch every time this tab regains focus instead.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const isDownloaded = (modelId: string) => downloaded.some(m => m.modelId === modelId);

  const handleDownload = async (model: ModelInfo) => {
    try {
      const handle = await downloadModel(model, fraction => {
        setDownloads(prev => ({...prev, [model.id]: {fraction, cancel: handle.cancel}}));
      });
      setDownloads(prev => ({...prev, [model.id]: {fraction: 0, cancel: handle.cancel}}));
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
            if (model.mmprojPath) {
              await deleteDownloadedModel(model.mmprojPath);
            }
            await removeDownloadedModel(model.modelId);
            await refresh();
          },
        },
      ],
    );
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

  const openChat = (modelId: string) => navigation.navigate('Chat', {modelId});

  const query = search.trim().toLowerCase();
  const matchesSearch = (model: ModelInfo) =>
    !query ||
    model.name.toLowerCase().includes(query) ||
    model.description.toLowerCase().includes(query);

  const installedCatalogModels = downloaded
    .map(dm => getModelById(dm.modelId))
    .filter((m): m is ModelInfo => !!m)
    .filter(matchesSearch);

  const recommendedModel = device ? getModelById(device.recommendedModelId) : undefined;
  const highlightModelId = route.params?.highlightModelId;

  return (
    <AIPalScaffold scroll>
      <Text style={typography.title}>Models</Text>
      <Text style={styles.subtitle}>Download a model to chat fully offline.</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search models..."
        placeholderTextColor={colors.textMuted}
        style={styles.search}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for your device</Text>
        {analyzing ? (
          <LoadingState label="Checking your phone..." />
        ) : recommendedModel ? (
          <ModelCard
            model={recommendedModel}
            downloadedEntry={downloaded.find(m => m.modelId === recommendedModel.id)}
            downloadState={downloads[recommendedModel.id]}
            device={device ?? undefined}
            highlighted
            onDownload={() => handleDownload(recommendedModel)}
            onChat={() => openChat(recommendedModel.id)}
            onDelete={() => {
              const entry = downloaded.find(m => m.modelId === recommendedModel.id);
              if (entry) {
                handleDelete(entry);
              }
            }}
          />
        ) : null}
        <PrimaryButton
          label="Re-analyze my phone"
          variant="secondary"
          onPress={handleAnalyze}
          loading={analyzing}
          style={styles.reanalyzeButton}
        />
      </View>

      {installedCatalogModels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installed</Text>
          {installedCatalogModels.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              downloadedEntry={downloaded.find(m => m.modelId === model.id)}
              downloadState={downloads[model.id]}
              device={device ?? undefined}
              highlighted={highlightModelId === model.id}
              onDownload={() => handleDownload(model)}
              onChat={() => openChat(model.id)}
              onDelete={() => {
                const entry = downloaded.find(m => m.modelId === model.id);
                if (entry) {
                  handleDelete(entry);
                }
              }}
            />
          ))}
        </View>
      )}

      {customModels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imported Models</Text>
          {customModels
            .filter(
              m =>
                !query ||
                m.displayName.toLowerCase().includes(query),
            )
            .map(model => (
              <Card key={model.modelId} style={styles.modelCard}>
                <Text style={styles.modelName}>{model.displayName}</Text>
                <View style={styles.actionRow}>
                  <PrimaryButton
                    label="Use this model"
                    onPress={() => openChat(model.modelId)}
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

      {TIERS.map(tier => {
        const available = MODEL_CATALOG.filter(
          m => m.tier === tier && !isDownloaded(m.id) && matchesSearch(m),
        );
        if (available.length === 0) {
          return null;
        }
        return (
          <View key={tier} style={styles.section}>
            <Text style={styles.sectionTitle}>{TIER_LABEL[tier]}</Text>
            {available.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                downloadState={downloads[model.id]}
                device={device ?? undefined}
                highlighted={highlightModelId === model.id}
                onDownload={() => handleDownload(model)}
                onChat={() => openChat(model.id)}
                onDelete={() => undefined}
              />
            ))}
          </View>
        );
      })}

      <Card style={styles.importCard}>
        <Text style={typography.heading}>Have a model already?</Text>
        <Text style={styles.importBody}>Import any .gguf file already saved on your phone.</Text>
        <PrimaryButton
          label="Import Local .gguf File"
          variant="secondary"
          onPress={handleImport}
          style={styles.importButton}
        />
      </Card>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md},
  search: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  reanalyzeButton: {marginTop: spacing.xs},
  modelCard: {marginBottom: spacing.sm},
  modelName: {...typography.heading, marginBottom: spacing.sm},
  actionRow: {flexDirection: 'row', gap: spacing.sm},
  flexButton: {flex: 1},
  inlineButton: {paddingHorizontal: spacing.md},
  importCard: {marginTop: spacing.sm, marginBottom: spacing.xl},
  importBody: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md},
  importButton: {marginTop: spacing.xs},
});
