import {initLlama, LlamaContext} from '@pocketpalai/llama.rn';
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
};

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
  } = initOptions;

  activeInit = (async () => {
    const ctx = await initLlama(
      {
        model: filePath,
        n_ctx: contextSize,
        n_threads: nThreads,
        // GPU offload (n_gpu_layers) is iOS-only in this llama.rn binding --
        // deliberately left at 0 rather than exposed as a togglable setting
        // on Android, where it would silently do nothing.
        n_gpu_layers: 0,
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
