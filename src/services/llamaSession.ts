import {initLlama, LlamaContext} from '@pocketpalai/llama.rn';

let activeContext: LlamaContext | null = null;
let activeModelId: string | null = null;
let activeInit: Promise<LlamaContext> | null = null;

export async function getLlamaContext(
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
      n_ctx: 2048,
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

export function getActiveModelId(): string | null {
  return activeModelId;
}
