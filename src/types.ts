export type ModelTier = 'weak' | 'medium' | 'strong';

/** Whether a model is a plain text LLM or a vision-language model. */
export type ModelCapability = 'text' | 'vision';

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
  /** Defaults to 'text' for existing entries; 'vision' models also need mmproj*. */
  capability?: ModelCapability;
  /** Vision projector GGUF -- present only for capability: 'vision' models. */
  mmprojUrl?: string;
  mmprojFileName?: string;
  mmprojSizeBytes?: number;
};

export type DownloadedModel = {
  modelId: string;
  filePath: string;
  sizeBytes: number;
  downloadedAt: number;
  isCustomImport: boolean;
  displayName: string;
  /** Present when the model is a vision model and its mmproj has been downloaded alongside filePath. */
  mmprojPath?: string;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Local path to an image attached to this message, if any (one per message). */
  imagePath?: string;
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
  /**
   * The persona whose system prompt is used for this conversation's turns.
   * Missing on conversations created before the AIPals persona system
   * existed -- callers fall back to the built-in persona when unset.
   */
  personaId?: string;
};

export type DeviceTier = {
  tier: ModelTier;
  totalRamGB: number;
  freeStorageGB: number;
  recommendedModelId: string;
};

/**
 * A named AI persona: a system prompt plus presentation (name/avatar/
 * tagline). Riya/MustaAI (see data/persona.ts) ships as the seeded
 * isBuiltIn: true persona so existing behavior is unchanged after upgrade;
 * users can create additional personas alongside it.
 */
export type Persona = {
  id: string;
  name: string;
  tagline: string;
  avatarEmoji: string;
  systemPrompt: string;
  /** Pre-selects this model when starting a new chat with this persona. */
  defaultModelId?: string;
  /** True only for the seeded Riya persona -- blocks deletion, not editing. */
  isBuiltIn: boolean;
  /** Lets this persona use Internet Search (still gated globally by the
   * Settings > Internet Search disclosure + a configured provider/key). */
  internetSearchEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
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
