import {getJSON, setJSON, KEYS} from './asyncStore';

export type AppSettings = {
  temperature: number;
  maxTokens: number;
  contextSize: number;
};

// Matches today's hardcoded values exactly (ChatScreen's old n_predict:512,
// contextWindow.ts's DEFAULT_CONTEXT_SIZE:2048, and llama.cpp's own default
// temperature the app has always effectively run at) -- upgrading users see
// identical generation behavior until they explicitly touch Advanced settings.
const DEFAULTS: AppSettings = {
  temperature: 0.8,
  maxTokens: 512,
  contextSize: 2048,
};

export async function getAppSettings(): Promise<AppSettings> {
  const stored = await getJSON<Partial<AppSettings>>(KEYS.appSettings, {});
  return {...DEFAULTS, ...stored};
}

export async function setAppSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getAppSettings();
  await setJSON(KEYS.appSettings, {...current, ...patch});
}
