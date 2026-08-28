import {initLlama, LlamaContext} from '@pocketpalai/llama.rn';
import {InferenceEngine, adaptLlamaContext} from './inferenceEngine';
import {DEFAULT_CONTEXT_SIZE} from './contextWindow';

let activeContext: LlamaContext | null = null;
let activeModelId: string | null = null;
let activeInit: Promise<LlamaContext> | null = null;

async function getOrInitContext(
  modelId: string,
  filePath: string,
  onProgress?: (progress: number) => void,
): Promise<LlamaContext> {
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

  activeInit = initLlama(
    {
      model: filePath,
      n_ctx: DEFAULT_CONTEXT_SIZE,
      n_threads: 4,
      n_gpu_layers: 0,
    },
    onProgress,
  );

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
 * the previous context before loading the new one.
 */
export async function getInferenceEngine(
  modelId: string,
  filePath: string,
  onProgress?: (progress: number) => void,
): Promise<InferenceEngine> {
  const ctx = await getOrInitContext(modelId, filePath, onProgress);
  return adaptLlamaContext(ctx);
}

export function getActiveModelId(): string | null {
  return activeModelId;
}
