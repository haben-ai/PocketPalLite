export type ModelTier = 'weak' | 'medium' | 'strong';

export type ModelInfo = {
  id: string;
  name: string;
  tier: ModelTier;
  params: string;
  quant: string;
  sizeBytes: number;
  fileName: string;
  description: string;
  repoUrl: string;
  downloadUrl: string;
  minRamGB: number;
  /**
   * Languages this model is known to handle natively/reliably (e.g. ['en']).
   * Optional and unused in Phase 1 -- reserved for the future translation
   * pipeline to decide when translation is needed vs. unnecessary.
   */
  nativeLanguages?: string[];
};

export type DownloadedModel = {
  modelId: string;
  filePath: string;
  sizeBytes: number;
  downloadedAt: number;
  isCustomImport: boolean;
  displayName: string;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  modelId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /**
   * The user's detected/selected conversation language (e.g. 'sw', 'am').
   * Optional and unpopulated in Phase 1 (NoOpLanguagePipeline doesn't set
   * it) -- existing stored conversations without this field remain valid.
   */
  language?: string;
};

export type DeviceTier = {
  tier: ModelTier;
  totalRamGB: number;
  freeStorageGB: number;
  recommendedModelId: string;
};

/**
 * A translation model's language code, using NLLB's Flores-200 style codes
 * (e.g. 'eng_Latn', 'swh_Latn'), since that's the tokenizer vocabulary the
 * Phase 2 translation engine is built against.
 */
export type LanguageCode = string;

/**
 * Deliberately separate from ModelInfo: translation models ship as multiple
 * files (encoder, decoder, tokenizer.json, tokenizer_config.json) rather
 * than one GGUF file, and are described by language pairs, not GGUF
 * quant/tier metadata.
 */
export type TranslationModelInfo = {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  encoderUrl: string;
  decoderUrl: string;
  tokenizerUrl: string;
  tokenizerConfigUrl: string;
  encoderSizeBytes: number;
  decoderSizeBytes: number;
  supportedLanguages: LanguageCode[];
};

/** Separate from DownloadedModel for the same multi-file reason as above. */
export type DownloadedTranslationModel = {
  modelId: string;
  encoderPath: string;
  decoderPath: string;
  tokenizerPath: string;
  tokenizerConfigPath: string;
  downloadedAt: number;
};
