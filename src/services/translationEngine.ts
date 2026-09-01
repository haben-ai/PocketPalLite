import {InferenceSession, Tensor} from 'onnxruntime-react-native';
import {Tokenizer} from '@huggingface/tokenizers';
import RNFS from 'react-native-fs';
import {DownloadedTranslationModel, LanguageCode} from '../types';

const EOS_TOKEN_ID = 2;
const DECODER_START_TOKEN_ID = 2;
// Deliberately short for a spike -- the decoder graph recomputes the full
// sequence every step (see translationModels.ts for why), so latency grows
// with this. 128 is plenty for a test sentence.
const MAX_NEW_TOKENS = 128;

type Sessions = {
  encoder: InferenceSession;
  decoder: InferenceSession;
  tokenizer: Tokenizer;
};

let active: {modelId: string; sessions: Sessions} | null = null;
let activeInit: Promise<Sessions> | null = null;

async function loadSessions(
  model: DownloadedTranslationModel,
): Promise<Sessions> {
  const [encoder, decoder, tokenizerJsonRaw, tokenizerConfigRaw] =
    await Promise.all([
      InferenceSession.create(model.encoderPath),
      InferenceSession.create(model.decoderPath),
      RNFS.readFile(model.tokenizerPath, 'utf8'),
      RNFS.readFile(model.tokenizerConfigPath, 'utf8'),
    ]);

  const tokenizer = new Tokenizer(
    JSON.parse(tokenizerJsonRaw),
    JSON.parse(tokenizerConfigRaw),
  );

  return {encoder, decoder, tokenizer};
}

async function getSessions(
  model: DownloadedTranslationModel,
): Promise<Sessions> {
  if (active && active.modelId === model.modelId) {
    return active.sessions;
  }
  if (activeInit) {
    await activeInit.catch(() => undefined);
  }
  if (active) {
    const toRelease = active.sessions;
    active = null;
    await Promise.all([
      toRelease.encoder.release().catch(() => undefined),
      toRelease.decoder.release().catch(() => undefined),
    ]);
  }

  activeInit = loadSessions(model);
  const sessions = await activeInit;
  active = {modelId: model.modelId, sessions};
  activeInit = null;
  return sessions;
}

/** For on-device debugging: confirms the actual ONNX graph I/O names. */
export async function describeSessions(
  model: DownloadedTranslationModel,
): Promise<{
  encoderInputs: readonly string[];
  encoderOutputs: readonly string[];
  decoderInputs: readonly string[];
  decoderOutputs: readonly string[];
}> {
  const {encoder, decoder} = await getSessions(model);
  return {
    encoderInputs: encoder.inputNames,
    encoderOutputs: encoder.outputNames,
    decoderInputs: decoder.inputNames,
    decoderOutputs: decoder.outputNames,
  };
}

function requireTokenId(tokenizer: Tokenizer, token: string): number {
  const id = tokenizer.token_to_id(token);
  if (id === undefined) {
    throw new Error(`Unknown token in NLLB vocabulary: "${token}"`);
  }
  return id;
}

function toInt64Tensor(ids: number[]): Tensor {
  return new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [
    1,
    ids.length,
  ]);
}

function argmaxLastPosition(logits: Tensor): number {
  const dims = logits.dims; // [1, seqLen, vocabSize]
  const vocabSize = dims[dims.length - 1];
  const seqLen = dims[dims.length - 2];
  const data = logits.data as Float32Array;
  const offset = (seqLen - 1) * vocabSize;

  let bestId = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < vocabSize; i++) {
    const score = data[offset + i];
    if (score > bestScore) {
      bestScore = score;
      bestId = i;
    }
  }
  return bestId;
}

export async function translate(
  model: DownloadedTranslationModel,
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
): Promise<string> {
  const {encoder, decoder, tokenizer} = await getSessions(model);

  const srcLangId = requireTokenId(tokenizer, sourceLang);
  const tgtLangId = requireTokenId(tokenizer, targetLang);

  // NLLB's non-legacy convention: [src_lang_code, ...source_tokens, eos].
  // Built manually rather than relying on the generic tokenizer's default
  // post-processor, since that NLLB-specific prefixing is normally
  // implemented inside a dedicated NllbTokenizer class that this lightweight,
  // format-generic tokenizer library doesn't special-case.
  const bodyIds = tokenizer.encode(text, {add_special_tokens: false})
    .ids as number[];
  const inputIds = [srcLangId, ...bodyIds, EOS_TOKEN_ID];

  const inputIdsTensor = toInt64Tensor(inputIds);
  const attentionMaskTensor = toInt64Tensor(inputIds.map(() => 1));

  const encoderOutputs = await encoder.run({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
  });
  const encoderHiddenStates = (encoderOutputs.last_hidden_state ??
    encoderOutputs[encoder.outputNames[0]]) as Tensor;

  const decoderInputIds = [DECODER_START_TOKEN_ID, tgtLangId];

  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const decoderOutputs = await decoder.run({
      input_ids: toInt64Tensor(decoderInputIds),
      encoder_attention_mask: attentionMaskTensor,
      encoder_hidden_states: encoderHiddenStates,
    });
    const logits = (decoderOutputs.logits ??
      decoderOutputs[decoder.outputNames[0]]) as Tensor;

    const nextTokenId = argmaxLastPosition(logits);
    decoderInputIds.push(nextTokenId);

    if (nextTokenId === EOS_TOKEN_ID) {
      break;
    }
  }

  // Drop the two priming tokens (decoder start, target-language code) and
  // any trailing EOS before detokenizing.
  const generatedIds = decoderInputIds
    .slice(2)
    .filter(id => id !== EOS_TOKEN_ID);
  return tokenizer.decode(generatedIds, {skip_special_tokens: true});
}
