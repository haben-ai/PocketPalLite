import {describe, it, expect, beforeEach, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAppSettings, setAppSettings} from './appSettings';

describe('appSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults matching the app\'s pre-Settings hardcoded values when nothing is stored', async () => {
    const settings = await getAppSettings();
    expect(settings).toEqual({temperature: 0.8, maxTokens: 512, contextSize: 2048});
  });

  it('round-trips a partial patch, merging over defaults', async () => {
    await setAppSettings({temperature: 0.5});
    const settings = await getAppSettings();
    expect(settings.temperature).toBe(0.5);
    expect(settings.maxTokens).toBe(512);
    expect(settings.contextSize).toBe(2048);
  });

  it('preserves earlier patches across multiple setAppSettings calls', async () => {
    await setAppSettings({temperature: 0.5});
    await setAppSettings({maxTokens: 1024});
    const settings = await getAppSettings();
    expect(settings).toEqual({temperature: 0.5, maxTokens: 1024, contextSize: 2048});
  });
});
