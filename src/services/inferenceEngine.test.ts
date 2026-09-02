import {describe, it, expect, jest} from '@jest/globals';
import {adaptLlamaContext, InferenceEngine} from './inferenceEngine';

/**
 * A hand-rolled stand-in for llama.rn's LlamaContext, shaped only like the
 * subset adaptLlamaContext actually depends on. No native module or
 * llama.cpp involved -- this tests the adapter's own logic in isolation.
 */
function makeFakeLlamaContext() {
  return {
    completion: jest.fn(
      async (_params: any, callback?: (data: {token: string}) => void) => {
        callback?.({token: 'Hel'});
        callback?.({token: 'lo'});
        return {text: 'Hello'};
      },
    ),
    initMultimodal: jest.fn(async (_params: {path: string; use_gpu?: boolean}) => true),
    stopCompletion: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
  };
}

describe('adaptLlamaContext', () => {
  it('produces an object conforming to the InferenceEngine surface', () => {
    const engine: InferenceEngine = adaptLlamaContext(makeFakeLlamaContext());
    expect(typeof engine.completion).toBe('function');
    expect(typeof engine.release).toBe('function');
  });

  it('forwards completion params to the underlying context and returns {text}', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    const result = await engine.completion({
      messages: [{role: 'user', content: 'hi'}],
      n_predict: 64,
      stop: ['</s>'],
    });

    expect(raw.completion).toHaveBeenCalledTimes(1);
    const [forwardedParams] = raw.completion.mock.calls[0];
    expect(forwardedParams).toEqual({
      messages: [{role: 'user', content: 'hi'}],
      n_predict: 64,
      stop: ['</s>'],
    });
    expect(result).toEqual({text: 'Hello'});
  });

  it('translates the raw {token} callback shape into plain token strings', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);
    const receivedTokens: string[] = [];

    await engine.completion(
      {messages: [{role: 'user', content: 'hi'}], n_predict: 64},
      token => receivedTokens.push(token),
    );

    expect(receivedTokens).toEqual(['Hel', 'lo']);
  });

  it('works with no onToken callback provided', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    await expect(
      engine.completion({messages: [{role: 'user', content: 'hi'}], n_predict: 64}),
    ).resolves.toEqual({text: 'Hello'});
  });

  it('delegates stop() to the underlying context', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    await engine.stop();

    expect(raw.stopCompletion).toHaveBeenCalledTimes(1);
  });

  it('delegates release() to the underlying context', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    await engine.release();

    expect(raw.release).toHaveBeenCalledTimes(1);
  });

  it('forwards mediaPaths as media_paths for vision completions', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    await engine.completion({
      messages: [{role: 'user', content: 'describe this'}],
      n_predict: 64,
      mediaPaths: ['/tmp/photo.jpg'],
    });

    const [forwardedParams] = raw.completion.mock.calls[0];
    expect(forwardedParams).toMatchObject({media_paths: ['/tmp/photo.jpg']});
  });

  it('forwards every sampling param to the raw context using llama.cpp\'s naming', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    await engine.completion({
      messages: [{role: 'user', content: 'hi'}],
      n_predict: -1,
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
      mirostat: 2,
      seed: 42,
      jinja: true,
      enableThinking: false,
    });

    const [forwardedParams] = raw.completion.mock.calls[0];
    expect(forwardedParams).toMatchObject({
      n_predict: -1,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.95,
      min_p: 0.05,
      xtc_threshold: 0.1,
      xtc_probability: 0,
      typical_p: 1,
      penalty_last_n: 64,
      penalty_repeat: 1,
      penalty_freq: 0,
      penalty_present: 0,
      mirostat: 2,
      seed: 42,
      jinja: true,
      enable_thinking: false,
    });
  });

  it('delegates initMultimodal() with path/use_gpu naming the raw context expects', async () => {
    const raw = makeFakeLlamaContext();
    const engine = adaptLlamaContext(raw);

    const result = await engine.initMultimodal('/models/mmproj.gguf', true);

    expect(raw.initMultimodal).toHaveBeenCalledWith({
      path: '/models/mmproj.gguf',
      use_gpu: true,
    });
    expect(result).toBe(true);
  });
});
