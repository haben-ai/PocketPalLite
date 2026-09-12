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
  /** The requested n_gpu_layers (99 when GPU Acceleration is on in
   * Settings, 0 when off) -- genuinely read by llama.cpp on both Android
   * (OpenCL, Adreno-gated) and iOS (Metal). This is the *request*; see
   * BenchmarkRun.gpuStatus for what the native backend actually did with
   * it, and BenchmarkResultMetrics.nGpuLayersActual for the real count used
   * during the timed run. */
  gpuLayers: number;
  flashAttnType: 'auto' | 'on' | 'off';
  cacheTypeK: CacheType;
  cacheTypeV: CacheType;
};

/** Real per-run acceleration status -- see llamaSession.ts's GpuStatus doc
 * comment for exactly where each field comes from natively. Kept as its own
 * type here (rather than importing GpuStatus directly) so this storage
 * schema doesn't depend on llamaSession's module graph. */
export type BenchmarkGpuStatus = {
  active: boolean;
  device?: string;
  reasonInactive: string;
  androidLib?: string;
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
  /** llama.cpp's own bench harness's real nGpuLayers field (from
   * BenchResult) -- the actual layer count used during this specific timed
   * run, not just the request sent at context init. */
  nGpuLayersActual: number;
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
  /** Real acceleration status for this run. Optional because runs saved
   * before this field existed won't have it -- BenchmarkScreen falls back
   * to an "unknown" display rather than assuming either state for those. */
  gpuStatus?: BenchmarkGpuStatus;
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
