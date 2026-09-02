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
};

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
