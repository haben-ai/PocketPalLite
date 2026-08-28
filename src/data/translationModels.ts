import {TranslationModelInfo} from '../types';

const REPO = 'https://huggingface.co/Xenova/nllb-200-distilled-600M/resolve/main';

/**
 * Single spike-scoped catalog entry: NLLB-200-distilled-600M, already
 * exported to ONNX (unlike AfriNLLB, which currently only ships as HF
 * Transformers/CTranslate2 checkpoints). Using an already-ONNX model lets
 * this spike isolate "does the onnxruntime-react-native runtime work" from
 * "does this specific model convert to ONNX cleanly". Swapping in AfriNLLB
 * later only requires a new catalog entry, once its own ONNX conversion is
 * validated separately -- no architecture change.
 */
export const TRANSLATION_MODEL_CATALOG: TranslationModelInfo[] = [
  {
    id: 'nllb-200-distilled-600m',
    name: 'NLLB-200 Distilled (600M)',
    description:
      "Meta's No Language Left Behind model, quantized. Covers 200 languages including all 5 target African languages. Used here to validate the ONNX Runtime pipeline before swapping in a language-specific model.",
    repoUrl: 'https://huggingface.co/Xenova/nllb-200-distilled-600M',
    encoderUrl: `${REPO}/onnx/encoder_model_quantized.onnx`,
    // Deliberately the plain (non-cached, non-"merged") decoder graph: it
    // recomputes the full sequence every decode step instead of threading
    // past_key_values, which is slower but has a far simpler, more
    // predictable I/O contract -- the right tradeoff for a feasibility
    // spike where getting a 48-tensor cache contract wrong on the first
    // try would burn a full native-rebuild-and-retest cycle.
    decoderUrl: `${REPO}/onnx/decoder_model_quantized.onnx`,
    tokenizerUrl: `${REPO}/tokenizer.json`,
    tokenizerConfigUrl: `${REPO}/tokenizer_config.json`,
    encoderSizeBytes: 419_120_483,
    decoderSizeBytes: 470_533_055,
    // Flores-200 codes for the spike's one proven pair, plus the other 4
    // target languages for reference (not yet exercised by the test screen).
    supportedLanguages: [
      'eng_Latn', // English
      'swh_Latn', // Swahili
      'amh_Ethi', // Amharic
      'hau_Latn', // Hausa
      'yor_Latn', // Yoruba
      'som_Latn', // Somali
    ],
  },
];

export const getTranslationModelById = (
  id: string,
): TranslationModelInfo | undefined =>
  TRANSLATION_MODEL_CATALOG.find(m => m.id === id);
