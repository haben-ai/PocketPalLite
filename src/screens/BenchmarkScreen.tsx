import React, {useEffect, useState} from 'react';
import {Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {AppScreen} from '../navigation/types';
import {DownloadedModel} from '../types';
import {getDownloadedModels} from '../storage/modelRegistry';
import {getModelById} from '../data/models';
import {getAppSettings} from '../storage/appSettings';
import {runBenchmark} from '../services/llamaSession';
import {getCpuCoreCount} from '../services/deviceCores';
import {
  BenchmarkRun,
  addBenchmarkRun,
  clearBenchmarkRuns,
  deleteBenchmarkRun,
  getBenchmarkRuns,
} from '../storage/benchmarks';
import {AIPalScaffold} from '../components/AIPalScaffold';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {ModelPickerList} from '../components/ModelPickerList';
import {TrashIcon} from '../components/Icons';

type Props = {onNavigate: (screen: AppScreen) => void};

type DeviceSummary = {
  label: string;
  coreCount: number | null;
  totalRamGB: number;
};

function formatSize(bytes: number): string {
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${Math.round(bytes / 1e6)} MB`;
}

/** Real GGUF metadata (ctx.model.nParams), not the catalog's rounded
 * "1B"-style label -- e.g. "999.89M params". */
function formatParamsLabel(nParams: number): string {
  if (!nParams || nParams <= 0) {
    return '';
  }
  const millions = nParams / 1e6;
  if (millions >= 1000) {
    return `${(millions / 1000).toFixed(2)}B params`;
  }
  return `${millions.toFixed(2)}M params`;
}

function formatTime(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(1)}s`;
}

function Stepper({
  value,
  step,
  min,
  max,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const {colors, typography} = useTheme();
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepperButton, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Text style={[styles.stepperGlyph, {color: colors.textPrimary}]}>−</Text>
      </TouchableOpacity>
      <Text style={[typography.body, styles.stepperValue]}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepperButton, {backgroundColor: colors.surfaceContainerHigh}]}>
        <Text style={[styles.stepperGlyph, {color: colors.textPrimary}]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Runs llama.cpp's real bench harness (llama.rn's ctx.bench(), the same
 * llama-bench the reference app uses) against a downloaded model and keeps
 * a local history of results. Every number shown is either a direct field
 * from the native BenchResult, real GGUF metadata (model.nParams), or a
 * sampled measurement (peak memory, via polling DeviceInfo during the
 * run) -- nothing here is a placeholder or invented figure. GPU Layers is
 * shown as 0 because llama.rn's n_gpu_layers is iOS-only in this binding;
 * Android genuinely runs CPU-only, so that's the honest number here rather
 * than a copied one.
 */
export function BenchmarkScreen({onNavigate}: Props) {
  const {colors, typography} = useTheme();
  const [downloaded, setDownloaded] = useState<DownloadedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [deviceCardOpen, setDeviceCardOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pp, setPp] = useState(512);
  const [tg, setTg] = useState(128);
  const [pl, setPl] = useState(1);
  const [nr, setNr] = useState(3);
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [results, setResults] = useState<BenchmarkRun[]>([]);

  useEffect(() => {
    (async () => {
      const [models, savedResults, coreCount, totalMemoryBytes] = await Promise.all([
        getDownloadedModels(),
        getBenchmarkRuns(),
        getCpuCoreCount(),
        DeviceInfo.getTotalMemory(),
      ]);
      setDownloaded(models);
      if (models.length > 0) {
        setSelectedModelId(models[0].modelId);
      }
      setResults(savedResults);
      setDevice({
        label: `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()} • Android ${DeviceInfo.getSystemVersion()}`,
        coreCount,
        totalRamGB: totalMemoryBytes / 1e9,
      });
    })();
    // Same one-shot-on-mount pattern the rest of the app's sidebar
    // destinations use -- this screen fully unmounts on navigation away.
  }, []);

  const selectedEntry = downloaded.find(m => m.modelId === selectedModelId);
  const selectedName = selectedEntry
    ? getModelById(selectedEntry.modelId)?.name ?? selectedEntry.displayName
    : undefined;

  const handleStartTest = async () => {
    if (!selectedEntry || running) {
      return;
    }
    setRunning(true);
    setStatusText('Preparing...');

    let peakMemoryBytes = 0;
    const totalMemoryBytes = await DeviceInfo.getTotalMemory();
    // llama.rn's bench() has no progress callback of its own (it's one
    // native call that returns only once finished) -- sampling used memory
    // on an interval while we await it is the only way to get a "peak"
    // figure at all, and it stays accurate as long as the JS timer keeps
    // firing, which it does since the native work runs off-thread.
    const sampler = setInterval(() => {
      try {
        const used = DeviceInfo.getUsedMemorySync();
        if (used > peakMemoryBytes) {
          peakMemoryBytes = used;
        }
      } catch {
        // Best-effort sampling -- a transient read failure just skips
        // this tick, it doesn't invalidate the run.
      }
    }, 300);

    try {
      const settings = await getAppSettings();
      const modelSettings = {
        contextSize: settings.contextSize,
        nBatch: settings.nBatch,
        nUbatch: settings.nUbatch,
        nThreads: settings.nThreads,
        gpuLayers: 0,
        flashAttnType: settings.flashAttnType,
        cacheTypeK: settings.cacheTypeK,
        cacheTypeV: settings.cacheTypeV,
      };
      const outcome = await runBenchmark(
        selectedEntry.modelId,
        selectedEntry.filePath,
        selectedEntry.mmprojPath,
        {
          contextSize: settings.contextSize,
          useMlock: settings.useMlock,
          useMmap: settings.useMmap,
          nBatch: settings.nBatch,
          nUbatch: settings.nUbatch,
          nThreads: settings.nThreads,
          flashAttnType: settings.flashAttnType,
          cacheTypeK: settings.cacheTypeK,
          cacheTypeV: settings.cacheTypeV,
        },
        {pp, tg, pl, nr},
        progress =>
          setStatusText(progress >= 100 ? 'Running benchmark...' : `Loading model... ${progress}%`),
      );

      const run: BenchmarkRun = {
        id: `bench-${Date.now()}`,
        modelId: selectedEntry.modelId,
        modelName: selectedName ?? selectedEntry.displayName,
        modelSizeBytes: selectedEntry.sizeBytes,
        modelParamsLabel: formatParamsLabel(outcome.model.nParams),
        config: {pp, tg, pl, nr},
        modelSettings,
        metrics: {
          speedPp: outcome.result.speedPp,
          speedTg: outcome.result.speedTg,
          totalTimeSeconds: outcome.result.t,
          peakMemoryBytes,
          totalMemoryBytes,
        },
        createdAt: Date.now(),
      };
      await addBenchmarkRun(run);
      setResults(prev => [run, ...prev]);
    } catch (err: any) {
      Alert.alert('Benchmark failed', err.message ?? String(err));
    } finally {
      clearInterval(sampler);
      setRunning(false);
      setStatusText(null);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete result', 'Remove this benchmark result?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBenchmarkRun(id);
          setResults(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (results.length === 0) {
      return;
    }
    Alert.alert('Clear all results', 'Remove every saved benchmark result?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearBenchmarkRuns();
          setResults([]);
        },
      },
    ]);
  };

  return (
    <AIPalScaffold scroll onBack={() => onNavigate({name: 'chat'})}>
      <Text style={typography.title}>Benchmark</Text>

      {device && (
        <Card style={styles.deviceCard}>
          <TouchableOpacity
            style={styles.deviceHeader}
            onPress={() => setDeviceCardOpen(v => !v)}
            activeOpacity={0.7}>
            <Text style={typography.heading}>Device Information</Text>
            <Text style={[styles.chevron, {color: colors.textMuted}]}>
              {deviceCardOpen ? '⌃' : '⌄'}
            </Text>
          </TouchableOpacity>
          {deviceCardOpen && (
            <>
              <Text style={[typography.caption, styles.deviceLine]}>{device.label}</Text>
              <Text style={[typography.caption, styles.deviceLine]}>
                {device.coreCount ? `${device.coreCount} cores • ` : ''}
                {device.totalRamGB.toFixed(1)} GB RAM
              </Text>
            </>
          )}
        </Card>
      )}

      <TouchableOpacity
        style={[
          styles.modelSelector,
          {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
        ]}
        onPress={() => downloaded.length > 0 && setModelPickerOpen(true)}
        disabled={downloaded.length === 0}>
        <Text style={typography.body} numberOfLines={1}>
          {selectedName ?? (downloaded.length === 0 ? 'No models downloaded' : 'Select a model')}
        </Text>
        {downloaded.length > 0 && <Text style={{color: colors.textMuted}}>⌄</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.advancedRow} onPress={() => setAdvancedOpen(v => !v)}>
        <Text style={[typography.body, {color: colors.accent}]}>
          ⚙ Advanced Settings {advancedOpen ? '⌃' : '⌄'}
        </Text>
      </TouchableOpacity>

      {advancedOpen && (
        <Card style={styles.advancedCard}>
          <View style={styles.paramRow}>
            <Text style={typography.caption}>Prompt Tokens (PP)</Text>
            <Stepper value={pp} step={128} min={32} max={4096} onChange={setPp} />
          </View>
          <View style={styles.paramRow}>
            <Text style={typography.caption}>Generation Tokens (TG)</Text>
            <Stepper value={tg} step={32} min={8} max={1024} onChange={setTg} />
          </View>
          <View style={styles.paramRow}>
            <Text style={typography.caption}>Parallel Sequences (PL)</Text>
            <Stepper value={pl} step={1} min={1} max={8} onChange={setPl} />
          </View>
          <View style={styles.paramRow}>
            <Text style={typography.caption}>Repetitions</Text>
            <Stepper value={nr} step={1} min={1} max={10} onChange={setNr} />
          </View>
        </Card>
      )}

      <Card style={[styles.warningCard, {backgroundColor: `${colors.danger}22`, borderColor: colors.danger}]}>
        <Text style={[typography.caption, {color: colors.danger}]}>
          Test could run for up to 2-5 minutes for larger models and cannot be interrupted once
          started.
        </Text>
      </Card>

      <PrimaryButton
        label="Start Test"
        onPress={handleStartTest}
        loading={running}
        disabled={running || !selectedEntry}
        style={styles.startButton}
      />
      {running && statusText && (
        <Text style={[typography.small, styles.statusText, {color: colors.textMuted}]}>
          {statusText}
        </Text>
      )}

      <View style={styles.resultsHeader}>
        <Text style={typography.heading}>Test Results</Text>
        {results.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton} hitSlop={4}>
            <TrashIcon size={14} color={colors.danger} />
            <Text style={[typography.caption, {color: colors.danger}]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {results.length === 0 ? (
        <Text style={[typography.caption, styles.emptyText]}>
          No benchmarks yet. Run a test to see results here.
        </Text>
      ) : (
        results.map(run => (
          <Card key={run.id} style={styles.resultCard}>
            <View style={styles.resultHeaderRow}>
              <View style={styles.flex}>
                <Text style={typography.heading}>{run.modelName}</Text>
                <Text style={[typography.small, {color: colors.textMuted}]}>
                  {formatSize(run.modelSizeBytes)}
                  {run.modelParamsLabel ? ` • ${run.modelParamsLabel}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(run.id)} hitSlop={6}>
                <TrashIcon size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, {borderTopColor: colors.outlineVariant}]} />

            <Text style={[typography.small, {color: colors.textMuted}]}>Benchmark Config</Text>
            <Text style={[typography.caption, styles.configLine]}>
              PP: {run.config.pp} • TG: {run.config.tg} • PL: {run.config.pl} • Rep: {run.config.nr}
            </Text>

            <Text style={[typography.small, styles.settingsLabel, {color: colors.textMuted}]}>
              Model Settings
            </Text>
            <Text style={[typography.caption, styles.configLine]}>
              Context: {run.modelSettings.contextSize} • Batch: {run.modelSettings.nBatch} • UBatch:{' '}
              {run.modelSettings.nUbatch}
            </Text>
            <Text style={[typography.caption, styles.configLine]}>
              CPU Threads: {run.modelSettings.nThreads} • GPU Layers: {run.modelSettings.gpuLayers}
            </Text>
            <Text style={[typography.caption, styles.configLine]}>
              Flash Attention {run.modelSettings.flashAttnType === 'off' ? 'Disabled' : 'Enabled'} •
              Cache Types: {run.modelSettings.cacheTypeK}/{run.modelSettings.cacheTypeV}
            </Text>

            <View style={[styles.metricsTile, {backgroundColor: colors.surfaceContainerHigh}]}>
              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={[typography.heading, styles.metricValue]}>
                    {run.metrics.speedPp.toFixed(2)} t/s
                  </Text>
                  <Text style={[typography.small, {color: colors.textMuted}]}>Prompt Processing</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[typography.heading, styles.metricValue]}>
                    {run.metrics.speedTg.toFixed(2)} t/s
                  </Text>
                  <Text style={[typography.small, {color: colors.textMuted}]}>Token Generation</Text>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metricCell}>
                  <Text style={[typography.heading, styles.metricValue]}>
                    {formatTime(run.metrics.totalTimeSeconds)}
                  </Text>
                  <Text style={[typography.small, {color: colors.textMuted}]}>Total Time</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[typography.heading, styles.metricValue]}>
                    {run.metrics.totalMemoryBytes > 0
                      ? `${((run.metrics.peakMemoryBytes / run.metrics.totalMemoryBytes) * 100).toFixed(1)}%`
                      : '--'}
                  </Text>
                  <Text style={[typography.small, {color: colors.textMuted}]}>
                    Peak Memory{'\n'}
                    {(run.metrics.peakMemoryBytes / 1e9).toFixed(2)} GB /{' '}
                    {(run.metrics.totalMemoryBytes / 1e9).toFixed(1)} GB
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[typography.small, styles.timestamp, {color: colors.textMuted}]}>
              {new Date(run.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))
      )}

      <Modal
        visible={modelPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModelPickerOpen(false)}>
        <TouchableOpacity
          style={[styles.pickerBackdrop, {backgroundColor: colors.scrim}]}
          activeOpacity={1}
          onPress={() => setModelPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => undefined}>
            <View
              style={[
                styles.pickerSheet,
                {backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant},
              ]}>
              <Text style={[typography.heading, styles.pickerTitle]}>Select a model</Text>
              <ScrollView style={styles.pickerScroll}>
                <ModelPickerList
                  models={downloaded}
                  activeModelId={selectedModelId}
                  onSelect={id => {
                    setSelectedModelId(id);
                    setModelPickerOpen(false);
                  }}
                />
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </AIPalScaffold>
  );
}

const styles = StyleSheet.create({
  deviceCard: {marginTop: spacing.md, marginBottom: spacing.md},
  deviceHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  chevron: {fontSize: 18, fontWeight: '700'},
  deviceLine: {marginTop: 4},
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  advancedRow: {alignItems: 'center', paddingVertical: spacing.sm},
  advancedCard: {marginBottom: spacing.sm, gap: spacing.sm},
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  stepper: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: {fontSize: 17, fontWeight: '700'},
  stepperValue: {minWidth: 44, textAlign: 'center', fontWeight: '600'},
  warningCard: {marginBottom: spacing.md, borderWidth: 1},
  startButton: {marginBottom: spacing.xs},
  statusText: {textAlign: 'center', marginBottom: spacing.md},
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  clearAllButton: {flexDirection: 'row', alignItems: 'center', gap: 6},
  emptyText: {paddingVertical: spacing.md, textAlign: 'center'},
  resultCard: {marginBottom: spacing.md},
  resultHeaderRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm},
  flex: {flex: 1},
  divider: {borderTopWidth: 1, marginVertical: spacing.sm},
  configLine: {marginTop: 2, lineHeight: 18},
  settingsLabel: {marginTop: spacing.sm},
  metricsTile: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metricsRow: {flexDirection: 'row', gap: spacing.md},
  metricCell: {flex: 1},
  metricValue: {marginBottom: 2},
  timestamp: {marginTop: spacing.sm},
  pickerBackdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  pickerSheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  pickerTitle: {marginBottom: spacing.sm},
  pickerScroll: {flexGrow: 0},
});
