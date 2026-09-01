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
