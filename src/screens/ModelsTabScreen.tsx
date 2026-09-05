import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {pick, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {MODEL_CATALOG, getModelById} from '../data/models';
import {DeviceTier, DownloadedModel, ModelInfo} from '../types';
import {
  deleteDownloadedModel,
  downloadModel,
  downloadRemoteModel,
  getFreeStorageBytes,
  importLocalModel,
  migrateLegacyModelIfPresent,
} from '../services/downloadManager';
import {
  getDownloadedModels,
  removeDownloadedModel,
  registerDownloadedModel,
} from '../storage/modelRegistry';
import {analyzeDevice} from '../services/deviceAnalyzer';
import {AppSettings, getAppSettings, setAppSettings} from '../storage/appSettings';
import {getSecret, SECRET_SERVICE} from '../services/secureStorage';
import {getActiveModelId, releaseActiveContext} from '../services/llamaSession';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {AnalysisRevealCard} from '../components/AnalysisRevealCard';
import {ModelCard, ModelRowInfo} from '../components/ModelCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {LoadingState} from '../components/LoadingState';
import {CollapsibleSection} from '../components/CollapsibleSection';
import {ModelsFilterMenu} from '../components/ModelsFilterMenu';
import {AddModelFab} from '../components/AddModelFab';
import {AddRemoteModelModal} from '../components/AddRemoteModelModal';
import {HuggingFaceSearchModal} from '../components/HuggingFaceSearchModal';
import {SlidersIcon} from '../components/Icons';

type DownloadState = {fraction: number; cancel: () => void} | undefined;

type ReadyItem = {row: ModelRowInfo; entry: DownloadedModel};

type Props = {
  highlightModelId?: string;
  onNavigate: (screen: AppScreen) => void;
};

function catalogToRow(model: ModelInfo): ModelRowInfo {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    sizeBytes: model.sizeBytes + (model.mmprojSizeBytes ?? 0),
    tier: model.tier,
    capability: model.capability,
    params: model.params,
    quant: model.quant,
    minRamGB: model.minRamGB,
  };
}

function sortRows<T extends {row: ModelRowInfo}>(items: T[], mode: AppSettings['modelsSortMode']): T[] {
  if (mode === 'name') {
    return [...items].sort((a, b) => a.row.name.localeCompare(b.row.name));
  }
  if (mode === 'size') {
    return [...items].sort((a, b) => a.row.sizeBytes - b.row.sizeBytes);
  }
  return items;
}

function groupByCapability<T extends {row: ModelRowInfo}>(items: T[]): {text: T[]; vision: T[]} {
  return {
    text: items.filter(i => (i.row.capability ?? 'text') === 'text'),
    vision: items.filter(i => i.row.capability === 'vision'),
  };
}

export function ModelsTabScreen({highlightModelId, onNavigate}: Props) {
  const {colors, typography} = useTheme();
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [device, setDevice] = useState<DeviceTier | null>(null);
  const [search, setSearch] = useState('');
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  const [hiddenModelIds, setHiddenModelIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<AppSettings['modelsFilterMode']>('all');
  const [sortMode, setSortMode] = useState<AppSettings['modelsSortMode']>('recommended');
  const [groupByType, setGroupByType] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const [hfSearchOpen, setHfSearchOpen] = useState(false);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [pendingRemote, setPendingRemote] = useState<Record<string, {name: string; sizeBytes: number}>>({});

  const refresh = useCallback(async () => {
    const all = await getDownloadedModels();
    setDownloaded(all);
    setActiveModelId(getActiveModelId());
  }, []);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      // The real analysis (two DeviceInfo calls) resolves near-instantly --
      // padding it to 2-3 seconds makes "Checking your phone..." read as
      // genuine analysis happening rather than a suspiciously instant
      // flash, without ever faking the result itself.
      const minDuration = 2000 + Math.random() * 1000;
      const [result] = await Promise.all([
        analyzeDevice(),
        new Promise(resolve => setTimeout(resolve, minDuration)),
      ]);
      setDevice(result);
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
      const settings = await getAppSettings();
      setHiddenModelIds(settings.hiddenModelIds);
      setFilterMode(settings.modelsFilterMode);
      setSortMode(settings.modelsSortMode);
      setGroupByType(settings.modelsGroupByType);
      await refresh();
      // Recommended-for-your-device is a standing section now, not a
      // button the user has to think to tap -- runs once automatically.
      await handleAnalyze();
    })();
    // This screen fully mounts/unmounts on every sidebar navigation (no
    // persistent tab bar keeping it alive in the background any more), so
    // a mount-only effect is enough to always show fresh data.
  }, [refresh, handleAnalyze]);

  const isDownloaded = (modelId: string) => downloaded.some(m => m.modelId === modelId);

  const withHfHeaders = async (): Promise<Record<string, string> | undefined> => {
    const {useHfToken} = await getAppSettings();
    const hfToken = useHfToken ? await getSecret(SECRET_SERVICE.hfToken) : null;
    return hfToken ? {Authorization: `Bearer ${hfToken}`} : undefined;
  };

  const runDownload = async (
    modelId: string,
    start: (onProgress: (fraction: number) => void) => Promise<{cancel: () => void; completion: Promise<void>}>,
  ) => {
    try {
      const handle = await start(fraction => {
        setDownloads(prev => ({...prev, [modelId]: {fraction, cancel: handle.cancel}}));
      });
      setDownloads(prev => ({...prev, [modelId]: {fraction: 0, cancel: handle.cancel}}));
      await handle.completion;
      setDownloads(prev => {
        const next = {...prev};
        delete next[modelId];
        return next;
      });
      await refresh();
      const {autoNavigateToChat} = await getAppSettings();
      if (autoNavigateToChat) {
        openChat(modelId);
      }
    } catch (err: any) {
      setDownloads(prev => {
        const next = {...prev};
        delete next[modelId];
        return next;
      });
      Alert.alert('Download failed', err.message ?? String(err));
    }
  };

  const handleDownload = (model: ModelInfo) =>
    runDownload(model.id, async onProgress => {
      const headers = await withHfHeaders();
      return downloadModel(model, fraction => onProgress(fraction), headers);
    });

  const handleDownloadRemote = async (url: string, displayName: string, sizeHint?: number) => {
    if (sizeHint) {
      const freeBytes = await getFreeStorageBytes();
      if (freeBytes < sizeHint * 1.05) {
        Alert.alert(
          'Not enough storage',
          `This model needs about ${(sizeHint / 1e9).toFixed(1)} GB, but only ${(freeBytes / 1e9).toFixed(
            1,
          )} GB is free.`,
        );
        return;
      }
    }
    const modelId = `remote-${Date.now()}`;
    // A remote/HF-sourced download has no existing catalog or "downloaded"
    // row to attach its progress to (unlike a catalog model, which already
    // renders in "Available to Download") -- track it separately so it gets
    // a visible card of its own for as long as it's in flight.
    setPendingRemote(prev => ({...prev, [modelId]: {name: displayName, sizeBytes: sizeHint ?? 0}}));
    return runDownload(modelId, async onProgress => {
      const headers = await withHfHeaders();
      return downloadRemoteModel(modelId, url, displayName, fraction => onProgress(fraction), headers);
    }).finally(() => {
      setPendingRemote(prev => {
        const next = {...prev};
        delete next[modelId];
        return next;
      });
    });
  };

  const handleSelectHfFile = ({
    fileName,
    url,
    sizeBytes,
  }: {
    repoId: string;
    fileName: string;
    url: string;
    sizeBytes?: number;
  }) => {
    const shortName = fileName.split('/').pop() ?? fileName;
    handleDownloadRemote(url, shortName.replace(/\.gguf$/i, ''), sizeBytes);
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

  const handleOffload = async () => {
    await releaseActiveContext();
    setActiveModelId(null);
  };

  const handleHide = async (modelId: string) => {
    const next = [...hiddenModelIds, modelId];
    setHiddenModelIds(next);
    await setAppSettings({hiddenModelIds: next});
  };

  const handleResetList = async () => {
    setHiddenModelIds([]);
    setFilterMode('all');
    setSortMode('recommended');
    setGroupByType(false);
    await setAppSettings({
      hiddenModelIds: [],
      modelsFilterMode: 'all',
      modelsSortMode: 'recommended',
      modelsGroupByType: false,
    });
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

  const openChat = (modelId: string) => onNavigate({name: 'chat', modelId});

  const query = search.trim().toLowerCase();
  const matchesQuery = (name: string, description?: string) =>
    !query || name.toLowerCase().includes(query) || (description ?? '').toLowerCase().includes(query);

  const recommendedModel = device ? getModelById(device.recommendedModelId) : undefined;

  const readyItems: ReadyItem[] = useMemo(() => {
    const items = downloaded
      .map(entry => {
        const catalogModel = getModelById(entry.modelId);
        const row = catalogModel ? catalogToRow(catalogModel) : {
          id: entry.modelId,
          name: entry.displayName,
          sizeBytes: entry.sizeBytes,
        };
        return {row, entry};
      })
      .filter(item => matchesQuery(item.row.name, item.row.description));
    return sortRows(items, sortMode);
  }, [downloaded, query, sortMode]);

  const pendingRemoteEntries = Object.entries(pendingRemote);

  const availableItems = useMemo(() => {
    const items = MODEL_CATALOG.filter(
      m => !isDownloaded(m.id) && !hiddenModelIds.includes(m.id) && matchesQuery(m.name, m.description),
    ).map(model => ({row: catalogToRow(model), model}));
    return sortRows(items, sortMode);
  }, [downloaded, hiddenModelIds, query, sortMode]);

  const showReady = filterMode !== 'available';
  const showAvailable = filterMode !== 'downloaded';

  const renderReadyCard = (item: ReadyItem) => (
    <ModelCard
      key={item.entry.modelId}
      model={item.row}
      downloadedEntry={item.entry}
      downloadState={downloads[item.entry.modelId]}
      device={device ?? undefined}
      highlighted={highlightModelId === item.entry.modelId}
      isActive={activeModelId === item.entry.modelId}
      onDownload={() => undefined}
      onChat={() => openChat(item.entry.modelId)}
      onDelete={() => handleDelete(item.entry)}
      onOffload={handleOffload}
    />
  );

  const renderAvailableCard = (item: {row: ModelRowInfo; model: ModelInfo}) => (
    <ModelCard
      key={item.model.id}
      model={item.row}
      downloadState={downloads[item.model.id]}
      device={device ?? undefined}
      highlighted={highlightModelId === item.model.id}
      onDownload={() => handleDownload(item.model)}
      onChat={() => openChat(item.model.id)}
      onDelete={() => undefined}
      onHide={() => handleHide(item.model.id)}
    />
  );

  const readyGroups = groupByType ? groupByCapability(readyItems) : null;
  const availableGroups = groupByType ? groupByCapability(availableItems) : null;

  return (
    <View style={styles.root}>
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <View style={styles.headerRow}>
        <Text style={typography.title}>Models</Text>
        <TouchableOpacity
          style={[styles.filterButton, {backgroundColor: colors.surfaceContainerHigh}]}
          onPress={() => setFilterMenuOpen(true)}
          hitSlop={6}>
          <SlidersIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Download a model to chat fully offline.</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search models..."
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border},
        ]}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Recommended for your device
        </Text>
        {analyzing ? (
          <LoadingState label="Checking your phone..." />
        ) : recommendedModel ? (
          <AnalysisRevealCard revealKey={recommendedModel.id}>
            <ModelCard
              model={catalogToRow(recommendedModel)}
              downloadedEntry={downloaded.find(m => m.modelId === recommendedModel.id)}
              downloadState={downloads[recommendedModel.id]}
              device={device ?? undefined}
              highlighted
              isActive={activeModelId === recommendedModel.id}
              onDownload={() => handleDownload(recommendedModel)}
              onChat={() => openChat(recommendedModel.id)}
              onOffload={handleOffload}
              onDelete={() => {
                const entry = downloaded.find(m => m.modelId === recommendedModel.id);
                if (entry) {
                  handleDelete(entry);
                }
              }}
            />
          </AnalysisRevealCard>
        ) : null}
        <PrimaryButton
          label="Re-analyze my phone"
          variant="secondary"
          onPress={handleAnalyze}
          loading={analyzing}
          style={styles.reanalyzeButton}
        />
      </View>

      {showReady && (
        <CollapsibleSection
          title="Ready to Use"
          count={readyItems.length + pendingRemoteEntries.length}
          defaultOpen>
          {pendingRemoteEntries.map(([id, pending]) => (
            <ModelCard
              key={id}
              model={{id, name: pending.name, sizeBytes: pending.sizeBytes}}
              downloadState={downloads[id]}
              onDownload={() => undefined}
              onChat={() => undefined}
              onDelete={() => undefined}
            />
          ))}
          {readyItems.length === 0 && pendingRemoteEntries.length === 0 ? (
            <Text style={[typography.caption, styles.emptyText]}>
              Nothing downloaded yet -- pick a model below, or tap + to add one.
            </Text>
          ) : readyGroups ? (
            <>
              {readyGroups.text.length > 0 && (
                <>
                  <Text style={[typography.small, styles.groupLabel, {color: colors.textMuted}]}>TEXT</Text>
                  {readyGroups.text.map(renderReadyCard)}
                </>
              )}
              {readyGroups.vision.length > 0 && (
                <>
                  <Text style={[typography.small, styles.groupLabel, {color: colors.textMuted}]}>VISION</Text>
                  {readyGroups.vision.map(renderReadyCard)}
                </>
              )}
            </>
          ) : (
            readyItems.map(renderReadyCard)
          )}
        </CollapsibleSection>
      )}

      {showAvailable && (
        <CollapsibleSection
          title="Available to Download"
          subtitle="Use + to find more models"
          count={availableItems.length}
          defaultOpen>
          {availableItems.length === 0 ? (
            <Text style={[typography.caption, styles.emptyText]}>
              {hiddenModelIds.length > 0
                ? 'All matching models are hidden -- open the filter menu to reset.'
                : 'Nothing left to download that matches your search.'}
            </Text>
          ) : availableGroups ? (
            <>
              {availableGroups.text.length > 0 && (
                <>
                  <Text style={[typography.small, styles.groupLabel, {color: colors.textMuted}]}>TEXT</Text>
                  {availableGroups.text.map(item => renderAvailableCard(item as {row: ModelRowInfo; model: ModelInfo}))}
                </>
              )}
              {availableGroups.vision.length > 0 && (
                <>
                  <Text style={[typography.small, styles.groupLabel, {color: colors.textMuted}]}>VISION</Text>
                  {availableGroups.vision.map(item => renderAvailableCard(item as {row: ModelRowInfo; model: ModelInfo}))}
                </>
              )}
            </>
          ) : (
            availableItems.map(renderAvailableCard)
          )}
        </CollapsibleSection>
      )}

      <View style={styles.spacerForFab} />
    </AIPalScaffold>

      {/* Rendered as a sibling of the scrollable AIPalScaffold, not inside
          it -- AddModelFab positions itself absolutely against its nearest
          parent, and nesting it inside the ScrollView's content would make
          it scroll away with the list instead of staying fixed on screen. */}
      <ModelsFilterMenu
        visible={filterMenuOpen}
        filterMode={filterMode}
        sortMode={sortMode}
        groupByType={groupByType}
        hiddenCount={hiddenModelIds.length}
        onFilterChange={mode => {
          setFilterMode(mode);
          setAppSettings({modelsFilterMode: mode});
        }}
        onSortChange={mode => {
          setSortMode(mode);
          setAppSettings({modelsSortMode: mode});
        }}
        onGroupByTypeChange={value => {
          setGroupByType(value);
          setAppSettings({modelsGroupByType: value});
        }}
        onReset={handleResetList}
        onClose={() => setFilterMenuOpen(false)}
      />

      <HuggingFaceSearchModal
        visible={hfSearchOpen}
        onClose={() => setHfSearchOpen(false)}
        onSelectFile={params => {
          setHfSearchOpen(false);
          handleSelectHfFile(params);
        }}
      />

      <AddRemoteModelModal
        visible={remoteModalOpen}
        onClose={() => setRemoteModalOpen(false)}
        onSubmit={handleDownloadRemote}
      />

      <AddModelFab
        onAddFromHuggingFace={() => setHfSearchOpen(true)}
        onAddLocal={handleImport}
        onAddRemote={() => setRemoteModalOpen(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {marginTop: spacing.xs, marginBottom: spacing.md},
  search: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  section: {marginBottom: spacing.lg},
  sectionTitle: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  reanalyzeButton: {marginTop: spacing.xs},
  emptyText: {paddingVertical: spacing.sm},
  groupLabel: {marginTop: spacing.xs, marginBottom: 4, letterSpacing: 0.5},
  spacerForFab: {height: 72},
});
