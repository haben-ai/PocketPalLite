import {describe, it, expect, afterEach} from '@jest/globals';
import {
  NoOpLanguagePipeline,
  DEFAULT_LANGUAGE,
  getLanguagePipeline,
  setLanguagePipeline,
  LanguagePipeline,
} from './languagePipeline';

describe('NoOpLanguagePipeline', () => {
  it('translateIn returns the original text unchanged', async () => {
    const text = 'Hello, how are you?';
    const result = await NoOpLanguagePipeline.translateIn(text, 'sw', 'en');
    expect(result).toBe(text);
  });

  it('translateOut returns the original text unchanged', async () => {
    const text = 'I am doing well, thank you.';
    const result = await NoOpLanguagePipeline.translateOut(text, 'en', 'sw');
    expect(result).toBe(text);
  });

  it('round-trips English through translateIn and translateOut unchanged', async () => {
    const original = 'What is a quadratic equation?';
    const intoLlm = await NoOpLanguagePipeline.translateIn(
      original,
      DEFAULT_LANGUAGE,
      DEFAULT_LANGUAGE,
    );
    const backToUser = await NoOpLanguagePipeline.translateOut(
      intoLlm,
      DEFAULT_LANGUAGE,
      DEFAULT_LANGUAGE,
    );
    expect(intoLlm).toBe(original);
    expect(backToUser).toBe(original);
  });

  it('detectLanguage has a safe, defined default', async () => {
    const detected = await NoOpLanguagePipeline.detectLanguage('anything');
    expect(typeof detected).toBe('string');
    expect(detected.length).toBeGreaterThan(0);
    expect(detected).toBe(DEFAULT_LANGUAGE);
  });

  it('does not throw on empty input', async () => {
    await expect(NoOpLanguagePipeline.translateIn('', 'en', 'en')).resolves.toBe('');
    await expect(NoOpLanguagePipeline.translateOut('', 'en', 'en')).resolves.toBe('');
    await expect(NoOpLanguagePipeline.detectLanguage('')).resolves.toBe(DEFAULT_LANGUAGE);
  });
});

describe('getLanguagePipeline / setLanguagePipeline', () => {
  afterEach(() => {
    // Restore the default so this test file doesn't leak state into others.
    setLanguagePipeline(NoOpLanguagePipeline);
  });

  it('defaults to NoOpLanguagePipeline', () => {
    expect(getLanguagePipeline()).toBe(NoOpLanguagePipeline);
  });

  it('allows swapping in a replacement implementation without changing callers', async () => {
    const fake: LanguagePipeline = {
      detectLanguage: async () => 'sw',
      translateIn: async () => 'translated-in',
      translateOut: async () => 'translated-out',
    };

    setLanguagePipeline(fake);
    expect(getLanguagePipeline()).toBe(fake);

    const pipeline = getLanguagePipeline();
    await expect(pipeline.translateIn('x', 'sw', 'en')).resolves.toBe(
      'translated-in',
    );
  });
});
