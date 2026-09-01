import {DownloadedTranslationModel} from '../types';
// Deliberately NOT a static top-level import: languagePipeline.ts is
// transitively imported by ChatScreen.tsx for every chat session, and most
// sessions only ever use NoOpLanguagePipeline. Eagerly importing
// translationEngine.ts here would pull in onnxruntime-react-native and the
// tokenizer stack on every app start for users who never touch translation.
// Lazy-required inside createNllbLanguagePipeline() below instead, only
// when that pipeline is actually constructed.
type TranslateFn = typeof import('./translationEngine').translate;

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

/**
 * Maps this interface's plain language codes (e.g. 'en', 'sw' -- what
 * ChatScreen and the rest of the app deal in) to NLLB's Flores-200 codes
 * (e.g. 'eng_Latn', 'swh_Latn' -- what the ONNX tokenizer's vocabulary
 * actually uses). Spike-scoped: only the one proven pair plus the other 4
 * target languages for when they're wired up.
 */
const NLLB_LANGUAGE_CODES: Record<string, string> = {
  en: 'eng_Latn',
  sw: 'swh_Latn',
  am: 'amh_Ethi',
  ha: 'hau_Latn',
  yo: 'yor_Latn',
  so: 'som_Latn',
};

function toNllbCode(code: string): string {
  const mapped = NLLB_LANGUAGE_CODES[code];
  if (!mapped) {
    throw new Error(`No NLLB language mapping for "${code}"`);
  }
  return mapped;
}

/**
 * The Phase 2 spike's LanguagePipeline implementation, backed by
 * translationEngine.ts (ONNX Runtime + NLLB-200). detectLanguage is
 * intentionally a fixed value here, not real detection -- this spike is
 * about proving the translation runtime works, not language identification.
 * The concrete proof this exists for: ChatScreen never had to change to
 * accommodate this, only the active pipeline (via setLanguagePipeline)
 * would need to, once this is wired into live chat.
 */
export function createNllbLanguagePipeline(
  model: DownloadedTranslationModel,
  fixedSourceLanguage: string,
): LanguagePipeline {
  const translate: TranslateFn = require('./translationEngine').translate;

  return {
    async detectLanguage(_text: string): Promise<string> {
      return fixedSourceLanguage;
    },
    async translateIn(
      text: string,
      sourceLanguage: string,
      targetLanguage: string,
    ): Promise<string> {
      if (sourceLanguage === targetLanguage) {
        return text;
      }
      return translate(
        model,
        text,
        toNllbCode(sourceLanguage),
        toNllbCode(targetLanguage),
      );
    },
    async translateOut(
      text: string,
      sourceLanguage: string,
      targetLanguage: string,
    ): Promise<string> {
      if (sourceLanguage === targetLanguage) {
        return text;
      }
      return translate(
        model,
        text,
        toNllbCode(sourceLanguage),
        toNllbCode(targetLanguage),
      );
    },
  };
}
