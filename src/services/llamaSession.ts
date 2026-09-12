import {initLlama, LlamaContext, BenchResult} from '@pocketpalai/llama.rn';
import {InferenceEngine, adaptLlamaContext} from './inferenceEngine';
import {DEFAULT_CONTEXT_SIZE} from './contextWindow';
import {CacheType} from '../storage/appSettings';

let activeContext: LlamaContext | null = null;
let activeModelId: string | null = null;
let activeInit: Promise<LlamaContext> | null = null;

/** Init-time params that come from AppSettings, as opposed to the fixed
 * modelId/filePath/mmprojPath identity of what's being loaded. */
export type ContextInitOptions = {
  contextSize?: number;
  useMlock?: boolean;
  useMmap?: boolean;
  nBatch?: number;
  nUbatch?: number;
  nThreads?: number;
  flashAttnType?: 'auto' | 'on' | 'off';
  cacheTypeK?: CacheType;
  cacheTypeV?: CacheType;
  gpuOffloadEnabled?: boolean;
};

/**
 * Real per-load acceleration status, read directly off the fields llama.rn's
 * native layer already computes and returns from initContext (LlamaContext's
 * own gpu/gpuDevice/reasonNoGPU/androidLib properties -- see
 * LlamaContext.java's isGpuEnabled()/getReasonNoGpu()/getGpuDevice() on
 * Android and RNLlamaContext.mm's isMetalEnabled/reasonNoMetal on iOS,
 * unified into the same three JS fields on both platforms). Not a guess or
 * a JS-side inference from the request -- this is what the native backend
 * actually did with it.
 */
export type GpuStatus = {
  active: boolean;
  device?: string;
  reasonInactive: string;
  /** Android only -- the specific .so variant that got loaded (e.g.
   * "rnllama_jni_v8_2_dotprod_i8mm_opencl" when GPU-accelerated,
   * "rnllama_jni_v8_2_dotprod_i8mm" when not). Undefined on iOS, which has
   * no equivalent concept (one xcframework, Metal picked at runtime). */
  androidLib?: string;
};

function readGpuStatus(ctx: LlamaContext): GpuStatus {
  return {
    active: ctx.gpu,
    device: ctx.gpuDevice,
    reasonInactive: ctx.reasonNoGPU,
    androidLib: ctx.androidLib,
  };
}

let lastKnownGpuStatus: GpuStatus | null = null;

function logGpuStatus(ctx: LlamaContext): void {
  const status = readGpuStatus(ctx);
  lastKnownGpuStatus = status;
  console.log(
    '[llamaSession] GPU acceleration:',
    status.active ? `ACTIVE (${status.device ?? 'unknown device'})` : `inactive (${status.reasonInactive})`,
    status.androidLib ? `-- native lib: ${status.androidLib}` : '',
  );
}

/**
 * The real acceleration status from the most recent model load this
 * session, or null if no model has loaded yet. GPU status is inherently
 * per-context (only known once llama.cpp has actually tried to init a
 * backend), so this can't be answered before that first happens -- callers
 * (Settings' "Device Selection" row) show a neutral "not detected yet"
 * state for null rather than guessing.
 */
export function getLastKnownGpuStatus(): GpuStatus | null {
  return lastKnownGpuStatus;
}

async function getOrInitContext(
  modelId: string,
  filePath: string,
  mmprojPath: string | undefined,
  onProgress?: (progress: number) => void,
  initOptions: ContextInitOptions = {},
): Promise<LlamaContext> {
  // Same-model reuse deliberately doesn't compare initOptions -- a Settings
  // change to context length/memory lock/memory mapping only takes effect
  // the next time this model is unloaded/reloaded (surfaced as an inline
  // caption in Settings, not silently ignored).
  if (activeModelId === modelId && activeContext) {
    return activeContext;
  }

  if (activeInit) {
    await activeInit.catch(() => undefined);
  }

  if (activeContext) {
    const toRelease = activeContext;
    activeContext = null;
    activeModelId = null;
    await toRelease.release().catch(() => undefined);
  }

  const {
    contextSize = DEFAULT_CONTEXT_SIZE,
    useMlock = false,
    useMmap = true,
    nBatch = 512,
    nUbatch = 512,
    nThreads = 4,
    flashAttnType = 'auto',
    cacheTypeK = 'f16',
    cacheTypeV = 'f16',
    gpuOffloadEnabled = true,
  } = initOptions;

  activeInit = (async () => {
    const ctx = await initLlama(
      {
        model: filePath,
        n_ctx: contextSize,
        n_threads: nThreads,
        // Real hardware-acceleration request, not iOS-only: on Android,
        // llama.rn auto-selects an OpenCL-accelerated native library when
        // LlamaContext.java's own device check (Adreno/Qualcomm string
        // match) succeeds; on iOS, RNLlamaContext.mm compiles with Metal
        // (LM_GGML_USE_METAL) and checks MTLGPUFamilyApple7 support at
        // runtime. Either way n_gpu_layers is genuinely read by llama.cpp
        // (jni.cpp on Android, the .mm context on iOS) -- 99 requests
        // "offload every layer that fits"; on a device/model where no GPU
        // backend is available or engaged, llama.cpp silently falls back to
        // CPU, so this is safe to always request rather than needing
        // per-device detection here. logGpuStatus() below reports what
        // actually happened, not just what was requested.
        n_gpu_layers: gpuOffloadEnabled ? 99 : 0,
        use_mlock: useMlock,
        use_mmap: useMmap,
        n_batch: nBatch,
        n_ubatch: nUbatch,
        flash_attn_type: flashAttnType,
        // llama.cpp only honors a non-default KV cache quantization together
        // with flash attention -- matches the same gating the Settings UI
        // applies (cache type controls disabled while Flash Attention is
        // off), rather than silently sending a value that'd be ignored.
        ...(flashAttnType !== 'off' && {
          cache_type_k: cacheTypeK,
          cache_type_v: cacheTypeV,
        }),
      },
      onProgress,
    );
    logGpuStatus(ctx);
    if (mmprojPath) {
      await ctx.initMultimodal({path: mmprojPath, use_gpu: false});
    }
    return ctx;
  })();

  const ctx = await activeInit;
  activeContext = ctx;
  activeModelId = modelId;
  activeInit = null;
  return ctx;
}

/**
 * The llama.rn-backed InferenceEngine implementation. This is the only file
 * that imports @pocketpalai/llama.rn directly -- callers (ChatScreen) get
 * back an engine-agnostic InferenceEngine, never the concrete LlamaContext.
 * Preserves the single-active-model lifecycle: switching modelId releases
 * the previous context before loading the new one. Vision models pass
 * mmprojPath, which is loaded via initMultimodal() right after the base
 * context is ready, once, before the engine is handed back.
 */
export async function getInferenceEngine(
  modelId: string,
  filePath: string,
  mmprojPath?: string,
  onProgress?: (progress: number) => void,
  initOptions: ContextInitOptions = {},
): Promise<InferenceEngine> {
  const ctx = await getOrInitContext(modelId, filePath, mmprojPath, onProgress, initOptions);
  return adaptLlamaContext(ctx);
}

export function getActiveModelId(): string | null {
  return activeModelId;
}

export type BenchmarkOutcome = {
  result: BenchResult;
  /** Real GGUF metadata read at load time (llama.rn's own LlamaContext.model
   * field) -- includes the actual parameter count (nParams), not the
   * catalog's rounded "1B"-style label. */
  model: LlamaContext['model'];
  /** Real acceleration status for this run -- see GpuStatus's doc comment.
   * result.nGpuLayers (from llama.cpp's own bench harness) is the actual
   * layer count used during the timed run, which is what "GPU layer usage"
   * means here, not just the request sent at init. */
  gpuStatus: GpuStatus;
};

/**
 * Runs llama.cpp's real bench harness (llama.rn's ctx.bench(), which wraps
 * llama-bench) against the given model, loading it first if it isn't
 * already the active context. Reuses the exact same init path as chat
 * (getOrInitContext), so a benchmark reflects the same context/memory/
 * threading settings a real chat session would use. Not cancellable --
 * llama.rn's bench() exposes no cancel handle, unlike model downloads.
 */
export async function runBenchmark(
  modelId: string,
  filePath: string,
  mmprojPath: string | undefined,
  initOptions: ContextInitOptions,
  params: {pp: number; tg: number; pl: number; nr: number},
  onModelLoadProgress?: (progress: number) => void,
): Promise<BenchmarkOutcome> {
  const ctx = await getOrInitContext(modelId, filePath, mmprojPath, onModelLoadProgress, initOptions);
  const result = await ctx.bench(params.pp, params.tg, params.pl, params.nr);
  return {result, model: ctx.model, gpuStatus: readGpuStatus(ctx)};
}

/**
 * Releases the active context without loading a replacement -- used by the
 * "Auto Offload/Load" setting to free memory while the app is backgrounded.
 * The next getInferenceEngine() call for the same model transparently
 * reinits it, same as switching models already does.
 */
export async function releaseActiveContext(): Promise<void> {
  if (!activeContext) {
    return;
  }
  const toRelease = activeContext;
  activeContext = null;
  activeModelId = null;
  await toRelease.release().catch(() => undefined);
}
