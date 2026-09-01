import {initLlama, LlamaContext} from '@pocketpalai/llama.rn';
import {InferenceEngine, adaptLlamaContext} from './inferenceEngine';
import {DEFAULT_CONTEXT_SIZE} from './contextWindow';

let activeContext: LlamaContext | null = null;
let activeModelId: string | null = null;
let activeInit: Promise<LlamaContext> | null = null;

async function getOrInitContext(
  modelId: string,
  filePath: string,
  mmprojPath: string | undefined,
  onProgress?: (progress: number) => void,
  contextSize: number = DEFAULT_CONTEXT_SIZE,
): Promise<LlamaContext> {
  // Same-model reuse deliberately doesn't compare contextSize -- a Settings
  // change to context length only takes effect the next time this model is
  // unloaded/reloaded (surfaced as an inline caption in Settings, not
  // silently ignored).
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

  activeInit = (async () => {
    const ctx = await initLlama(
      {
        model: filePath,
        n_ctx: contextSize,
        n_threads: 4,
        n_gpu_layers: 0,
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
  contextSize: number = DEFAULT_CONTEXT_SIZE,
): Promise<InferenceEngine> {
  const ctx = await getOrInitContext(modelId, filePath, mmprojPath, onProgress, contextSize);
  return adaptLlamaContext(ctx);
}

export function getActiveModelId(): string | null {
  return activeModelId;
}
