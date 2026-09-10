export type ModelTier = 'weak' | 'medium' | 'strong';

/** Whether a model is a plain text LLM or a vision-language model. */
export type ModelCapability = 'text' | 'vision';

/** The company that trained/originated the model (not the HF repo owner
 * that republished the GGUF, which is often a different, unrelated
 * account) -- drives which brand mark VendorLogo shows. 'other' covers any
 * origin without a recognized brand mark, not a guess. */
export type ModelVendor = 'google' | 'meta' | 'microsoft' | 'other';

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
  vendor: ModelVendor;
  /** Manifest revision for this catalog entry (bumped when its downloadUrl/
   * sha256 changes to point at different file content) -- not an upstream
   * HF commit pin, since every entry here tracks the repo's `main` branch. */
  version: string;
  /** SHA-256 of the exact file at downloadUrl, verified against Hugging
   * Face's own tree API (a GGUF's git-lfs `oid` *is* its SHA-256) before
   * being added here -- never guessed. downloadManager checks a completed
   * download against this before it's ever registered as usable. */
  sha256: string;
  /** SHA-256 of the file at mmprojUrl, same discipline as sha256 above.
   * Present only when mmprojUrl is. */
  mmprojSha256?: string;
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
  /** Assistant messages only -- from llama.rn's real completion timings
   * (NativeCompletionResultTimings.predicted_per_second), not estimated. */
  tokensPerSecond?: number;
  /** Assistant messages only -- time to first token in ms, from llama.rn's
   * real completion timings (NativeCompletionResultTimings.prompt_ms, the
   * prompt-processing time before generation starts). */
  ttftMs?: number;
  /** Assistant messages only -- the user's own thumbs up/down on this
   * reply. Purely local (never sent anywhere); tapping the same value again
   * clears it back to undefined. */
  feedback?: 'up' | 'down';
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
 * tagline). The default assistant (see data/persona.ts) ships as the
 * seeded isBuiltIn: true persona so existing behavior is unchanged after
 * upgrade; users can create additional personas alongside it.
 */
export type Persona = {
  id: string;
  name: string;
  tagline: string;
  /** Id of a lucide icon (see components/Icons.tsx::ASSISTANT_ICON_IDS),
   * not an emoji character -- rendered via AssistantAvatarIcon. */
  avatarIcon: string;
  systemPrompt: string;
  /** Pre-selects this model when starting a new chat with this persona. */
  defaultModelId?: string;
  /** True only for the seeded default persona -- blocks deletion, not editing. */
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
