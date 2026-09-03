import {getJSON, setJSON, KEYS} from './asyncStore';

/** 0 = Off, 1 = Mirostat v1, 2 = Mirostat v2 -- matches llama.cpp's own encoding. */
export type MirostatMode = 0 | 1 | 2;

export type AppSettings = {
  contextSize: number;

  /** 'unlimited' sends n_predict: -1; 'custom' sends maxTokens. */
  nPredictMode: 'unlimited' | 'custom';
  maxTokens: number;

  /** Maps to llama.rn's enable_thinking completion param. */
  includeThinkingInContext: boolean;

  temperature: number;
  topK: number;
  topP: number;
  minP: number;
  xtcThreshold: number;
  xtcProbability: number;
  typicalP: number;
  penaltyLastN: number;
  penaltyRepeat: number;
  penaltyFreq: number;
  penaltyPresent: number;
  mirostat: MirostatMode;
  /** -1 = random seed each generation, matching llama.cpp's own default. */
  seed: number;
  jinja: boolean;

  /** Maps to llama.rn's use_mlock init param. Applies next model load. */
  useMlock: boolean;
  /** Maps to llama.rn's use_mmap init param. Applies next model load. */
  useMmap: boolean;
  /** Navigate to Chat as soon as a model download/load starts. */
  autoNavigateToChat: boolean;
  /** Release the active llama context when the app is backgrounded. */
  autoOffload: boolean;

  /** 'system' follows the OS light/dark setting. */
  themeMode: 'light' | 'dark' | 'system';

  /** Maps to llama.rn's n_batch init param. Applies next model load. */
  nBatch: number;
  /** Maps to llama.rn's n_ubatch init param. Applies next model load. */
  nUbatch: number;
  /** Maps to llama.rn's n_threads init param. Applies next model load. */
  nThreads: number;
  /** Maps to llama.rn's flash_attn_type init param. Applies next model load. */
  flashAttnType: 'auto' | 'on' | 'off';
  /** Maps to llama.rn's cache_type_k init param -- only takes effect when
   * flashAttnType isn't 'off' (llama.cpp only honors a non-default KV cache
   * quantization together with flash attention). Applies next model load. */
  cacheTypeK: CacheType;
  /** Maps to llama.rn's cache_type_v init param. Same constraint as cacheTypeK. */
  cacheTypeV: CacheType;
};

/** The exact set of values llama.rn's public ContextParams type accepts for
 * cache_type_k/cache_type_v (see @pocketpalai/llama.rn/src/index.ts) --
 * kept in sync by hand since llama.rn doesn't export this type itself.
 * Note: llama.rn's own runtime validator (validCacheTypes) also accepts
 * 'bf16', but its exported TS type does not -- omitted here to stay
 * assignable to that type rather than fighting it with a cast. */
export type CacheType = 'f16' | 'f32' | 'q8_0' | 'q4_0' | 'q4_1' | 'iq4_nl' | 'q5_0' | 'q5_1';

// Every default below is the literal default shown/used by llama.cpp's own
// sampling API (confirmed against node_modules/@pocketpalai/llama.rn's
// NativeRNLlama.d.ts) -- upgrading users see identical generation behavior
// until they explicitly touch a setting.
const DEFAULTS: AppSettings = {
  contextSize: 2048,
  nPredictMode: 'unlimited',
  maxTokens: 512,
  includeThinkingInContext: true,
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  minP: 0.05,
  xtcThreshold: 0.1,
  xtcProbability: 0,
  typicalP: 1,
  penaltyLastN: 64,
  penaltyRepeat: 1,
  penaltyFreq: 0,
  penaltyPresent: 0,
  mirostat: 0,
  seed: -1,
  jinja: true,
  useMlock: false,
  useMmap: true,
  autoNavigateToChat: false,
  autoOffload: false,
  themeMode: 'system',
  nBatch: 512,
  nUbatch: 512,
  nThreads: 4,
  flashAttnType: 'auto',
  cacheTypeK: 'f16',
  cacheTypeV: 'f16',
};

export {DEFAULTS as APP_SETTINGS_DEFAULTS};

export async function getAppSettings(): Promise<AppSettings> {
  const stored = await getJSON<Partial<AppSettings>>(KEYS.appSettings, {});
  return {...DEFAULTS, ...stored};
}

export async function setAppSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getAppSettings();
  await setJSON(KEYS.appSettings, {...current, ...patch});
}

export async function resetAppSettingsToDefaults(): Promise<AppSettings> {
  await setJSON(KEYS.appSettings, DEFAULTS);
  return DEFAULTS;
}

/** The n_predict value to actually send to the engine for the current mode. */
export function resolveNPredict(settings: AppSettings): number {
  return settings.nPredictMode === 'unlimited' ? -1 : settings.maxTokens;
}
