/**
 * Abstraction for the future User -> LanguagePipeline -> InferenceEngine ->
 * LanguagePipeline -> User flow. Phase 1 ships only a no-op implementation;
 * a real offline African-language pipeline plugs in later via
 * setLanguagePipeline(), with no changes required in ChatScreen.
 */
export interface LanguagePipeline {
  detectLanguage(text: string): Promise<string>;
  translateIn(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string>;
  translateOut(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string>;
}

/**
 * The language the local LLM is assumed to operate in until real language
 * detection/translation exists. Used as the translateIn/translateOut pivot.
 */
export const DEFAULT_LANGUAGE = 'en';

export const NoOpLanguagePipeline: LanguagePipeline = {
  async detectLanguage(_text: string): Promise<string> {
    return DEFAULT_LANGUAGE;
  },
  async translateIn(
    text: string,
    _sourceLanguage: string,
    _targetLanguage: string,
  ): Promise<string> {
    return text;
  },
  async translateOut(
    text: string,
    _sourceLanguage: string,
    _targetLanguage: string,
  ): Promise<string> {
    return text;
  },
};

let activePipeline: LanguagePipeline = NoOpLanguagePipeline;

/** Read the currently configured pipeline. Defaults to the no-op passthrough. */
export function getLanguagePipeline(): LanguagePipeline {
  return activePipeline;
}

/**
 * Swap the active pipeline implementation (e.g. a future
 * AfricanLanguagePipeline). Screens depend on getLanguagePipeline() rather
 * than importing an implementation directly, so this is the only call site
 * that needs to change when a real pipeline ships.
 */
export function setLanguagePipeline(pipeline: LanguagePipeline): void {
  activePipeline = pipeline;
}
