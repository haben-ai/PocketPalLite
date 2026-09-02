/**
 * Minimal engine-agnostic surface ChatScreen actually needs. This exists so
 * ChatScreen never imports a concrete runtime type (e.g. llama.rn's
 * LlamaContext) directly, keeping the door open for a non-llama.cpp engine
 * later without touching the screen.
 */
export type EngineMessage = {
  role: string;
  content: string;
};

/**
 * Sampling parameters beyond n_predict/temperature -- every field here maps
 * 1:1 to a real completion() param llama.rn's native binding supports
 * (confirmed against node_modules/@pocketpalai/llama.rn/lib/typescript/
 * NativeRNLlama.d.ts), so these have a genuine effect on generation, not
 * just a UI reading.
 */
export type EngineSamplingParams = {
  topK?: number;
  topP?: number;
  minP?: number;
  xtcThreshold?: number;
  xtcProbability?: number;
  typicalP?: number;
  penaltyLastN?: number;
  penaltyRepeat?: number;
  penaltyFreq?: number;
  penaltyPresent?: number;
  mirostat?: number;
  seed?: number;
  jinja?: boolean;
  enableThinking?: boolean;
};

export type EngineCompletionParams = EngineSamplingParams & {
  messages: EngineMessage[];
  n_predict: number;
  stop?: string[];
  /** Local image file path(s) for the current turn -- vision models only. */
  mediaPaths?: string[];
  /** Sampling temperature; omitted lets llama.cpp use its own default. */
  temperature?: number;
};

export type EngineCompletionResult = {
  text: string;
};

export interface InferenceEngine {
  completion(
    params: EngineCompletionParams,
    onToken?: (token: string) => void,
  ): Promise<EngineCompletionResult>;
  /** Vision models only: loads the mmproj vision projector for this context. */
  initMultimodal(mmprojPath: string, useGpu?: boolean): Promise<boolean>;
  /** Interrupts an in-flight completion() call. */
  stop(): Promise<void>;
  release(): Promise<void>;
}

/**
 * Structural (not imported) shape of the subset of llama.rn's LlamaContext
 * this adapter relies on. Kept local so this file has no compile-time or
 * runtime dependency on @pocketpalai/llama.rn, which is what makes it safe
 * to unit test with a plain mock object.
 */
type RawLlamaLikeContext = {
  completion(
    params: {
      messages: EngineMessage[];
      n_predict: number;
      stop?: string[];
      media_paths?: string[];
      temperature?: number;
      top_k?: number;
      top_p?: number;
      min_p?: number;
      xtc_threshold?: number;
      xtc_probability?: number;
      typical_p?: number;
      penalty_last_n?: number;
      penalty_repeat?: number;
      penalty_freq?: number;
      penalty_present?: number;
      mirostat?: number;
      seed?: number;
      jinja?: boolean;
      enable_thinking?: boolean;
    },
    callback?: (data: {token: string}) => void,
  ): Promise<{text: string}>;
  initMultimodal(params: {path: string; use_gpu?: boolean}): Promise<boolean>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
};

/** Wraps a real (or fake, in tests) llama.rn-shaped context as an InferenceEngine. */
export function adaptLlamaContext(raw: RawLlamaLikeContext): InferenceEngine {
  return {
    completion: (params, onToken) =>
      raw
        .completion(
          {
            messages: params.messages,
            n_predict: params.n_predict,
            stop: params.stop,
            media_paths: params.mediaPaths,
            temperature: params.temperature,
            top_k: params.topK,
            top_p: params.topP,
            min_p: params.minP,
            xtc_threshold: params.xtcThreshold,
            xtc_probability: params.xtcProbability,
            typical_p: params.typicalP,
            penalty_last_n: params.penaltyLastN,
            penalty_repeat: params.penaltyRepeat,
            penalty_freq: params.penaltyFreq,
            penalty_present: params.penaltyPresent,
            mirostat: params.mirostat,
            seed: params.seed,
            jinja: params.jinja,
            enable_thinking: params.enableThinking,
          },
          onToken ? data => onToken(data.token) : undefined,
        )
        .then(result => ({text: result.text})),
    initMultimodal: (mmprojPath, useGpu) =>
      raw.initMultimodal({path: mmprojPath, use_gpu: useGpu}),
    stop: () => raw.stopCompletion(),
    release: () => raw.release(),
  };
}
