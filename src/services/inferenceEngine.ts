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

export type EngineCompletionParams = {
  messages: EngineMessage[];
  n_predict: number;
  stop?: string[];
};

export type EngineCompletionResult = {
  text: string;
};

export interface InferenceEngine {
  completion(
    params: EngineCompletionParams,
    onToken?: (token: string) => void,
  ): Promise<EngineCompletionResult>;
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
    params: {messages: EngineMessage[]; n_predict: number; stop?: string[]},
    callback?: (data: {token: string}) => void,
  ): Promise<{text: string}>;
  release(): Promise<void>;
};

/** Wraps a real (or fake, in tests) llama.rn-shaped context as an InferenceEngine. */
export function adaptLlamaContext(raw: RawLlamaLikeContext): InferenceEngine {
  return {
    completion: (params, onToken) =>
      raw
        .completion(
          params,
          onToken ? data => onToken(data.token) : undefined,
        )
        .then(result => ({text: result.text})),
    release: () => raw.release(),
  };
}
