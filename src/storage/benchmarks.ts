import {getJSON, setJSON, KEYS} from './asyncStore';
import {CacheType} from './appSettings';

/** The context/model init settings actually in effect for a given
 * benchmark run -- read from AppSettings at the moment the test started,
 * not re-derived later, so a saved result stays accurate even if the user
 * changes settings afterward. */
export type BenchmarkModelSettings = {
  contextSize: number;
  nBatch: number;
  nUbatch: number;
  nThreads: number;
  /** Always 0 on Android in this app -- llama.rn's n_gpu_layers is
   * iOS-only, deliberately left unexposed as a setting on Android. */
  gpuLayers: number;
  flashAttnType: 'auto' | 'on' | 'off';
  cacheTypeK: CacheType;
  cacheTypeV: CacheType;
};

export type BenchmarkConfig = {
  pp: number;
  tg: number;
  pl: number;
  nr: number;
};

export type BenchmarkResultMetrics = {
  speedPp: number;
  speedTg: number;
  /** Total wall-clock time for the bench run, in seconds. */
  totalTimeSeconds: number;
  /** Sampled peak of DeviceInfo.getUsedMemorySync() while the bench ran --
   * an approximation via polling, not an OS-reported peak-RSS stat (no such
   * API exists at the JS level), but real measured samples, not a guess. */
  peakMemoryBytes: number;
  totalMemoryBytes: number;
};

export type BenchmarkRun = {
  id: string;
  modelId: string;
  modelName: string;
  modelSizeBytes: number;
  /** e.g. "999.89M params" -- derived from the real GGUF metadata
   * (LlamaContext.model.nParams) read at load time, not the catalog's
   * rounded "1B"-style label. */
  modelParamsLabel: string;
  config: BenchmarkConfig;
  modelSettings: BenchmarkModelSettings;
  metrics: BenchmarkResultMetrics;
  createdAt: number;
};

export async function getBenchmarkRuns(): Promise<BenchmarkRun[]> {
  return getJSON<BenchmarkRun[]>(KEYS.benchmarkRuns, []);
}

export async function addBenchmarkRun(run: BenchmarkRun): Promise<void> {
  const all = await getBenchmarkRuns();
  // Newest first, matching how every other list in the app (conversations,
  // downloads) surfaces the most recent item at the top.
  await setJSON(KEYS.benchmarkRuns, [run, ...all]);
}

export async function deleteBenchmarkRun(id: string): Promise<void> {
  const all = await getBenchmarkRuns();
  await setJSON(KEYS.benchmarkRuns, all.filter(r => r.id !== id));
}

export async function clearBenchmarkRuns(): Promise<void> {
  await setJSON(KEYS.benchmarkRuns, []);
}
