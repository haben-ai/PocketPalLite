import {describe, it, expect, beforeEach, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAppSettings,
  setAppSettings,
  resetAppSettingsToDefaults,
  resolveNPredict,
  APP_SETTINGS_DEFAULTS,
} from './appSettings';

describe('appSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns the full defaults (matching llama.cpp\'s own sampling defaults) when nothing is stored', async () => {
    const settings = await getAppSettings();
    expect(settings).toEqual(APP_SETTINGS_DEFAULTS);
  });

  it('round-trips a partial patch, merging over defaults', async () => {
    await setAppSettings({temperature: 0.5});
    const settings = await getAppSettings();
    expect(settings.temperature).toBe(0.5);
    expect(settings.topK).toBe(APP_SETTINGS_DEFAULTS.topK);
    expect(settings.contextSize).toBe(APP_SETTINGS_DEFAULTS.contextSize);
  });

  it('preserves earlier patches across multiple setAppSettings calls', async () => {
    await setAppSettings({temperature: 0.5});
    await setAppSettings({maxTokens: 1024});
    const settings = await getAppSettings();
    expect(settings.temperature).toBe(0.5);
    expect(settings.maxTokens).toBe(1024);
  });

  it('a legacy stored object missing new fields still merges cleanly over defaults', async () => {
    // Shape written by the app before this phase -- only the three
    // original fields existed on disk.
    await AsyncStorage.setItem(
      'pocketpal:app_settings',
      JSON.stringify({temperature: 0.9, maxTokens: 256, contextSize: 4096}),
    );
    const settings = await getAppSettings();
    expect(settings.temperature).toBe(0.9);
    expect(settings.maxTokens).toBe(256);
    expect(settings.contextSize).toBe(4096);
    expect(settings.topK).toBe(APP_SETTINGS_DEFAULTS.topK);
    expect(settings.mirostat).toBe(APP_SETTINGS_DEFAULTS.mirostat);
    expect(settings.jinja).toBe(APP_SETTINGS_DEFAULTS.jinja);
  });

  it('resetAppSettingsToDefaults clears any patch back to defaults', async () => {
    await setAppSettings({temperature: 1.5, topK: 10, jinja: false});
    const reset = await resetAppSettingsToDefaults();
    expect(reset).toEqual(APP_SETTINGS_DEFAULTS);
    expect(await getAppSettings()).toEqual(APP_SETTINGS_DEFAULTS);
  });
});

describe('resolveNPredict', () => {
  it('returns -1 for unlimited mode regardless of maxTokens', async () => {
    expect(
      resolveNPredict({...APP_SETTINGS_DEFAULTS, nPredictMode: 'unlimited', maxTokens: 512}),
    ).toBe(-1);
  });

  it('returns maxTokens for custom mode', async () => {
    expect(
      resolveNPredict({...APP_SETTINGS_DEFAULTS, nPredictMode: 'custom', maxTokens: 1024}),
    ).toBe(1024);
  });
});
