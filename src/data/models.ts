import {ModelInfo} from '../types';

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'smollm2-135m',
    name: 'SmolLM2 135M Instruct',
    tier: 'weak',
    params: '135M',
    quant: 'Q4_K_M',
    sizeBytes: 105454432,
    fileName: 'smollm2-135m.gguf',
    description:
      'Fastest and lightest model available. Great for quick replies on older or budget phones.',
    repoUrl: 'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
    minRamGB: 2,
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M Instruct',
    tier: 'weak',
    params: '360M',
    quant: 'Q4_K_M',
    sizeBytes: 270590880,
    fileName: 'smollm2-360m.gguf',
    description:
      'A step up in reasoning quality while staying small and snappy on entry-level hardware.',
    repoUrl: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    minRamGB: 3,
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5 0.5B Instruct',
    tier: 'weak',
    params: '0.5B',
    quant: 'Q4_K_M',
    sizeBytes: 491400032,
    fileName: 'qwen2.5-0.5b.gguf',
    description:
      'Solid general-purpose replies for its size. A good all-rounder for weaker phones.',
    repoUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    minRamGB: 3,
  },
  {
    id: 'llama3.2-1b',
    name: 'Llama 3.2 1B Instruct',
    tier: 'medium',
    params: '1B',
    quant: 'Q4_K_M',
    sizeBytes: 807694464,
    fileName: 'llama3.2-1b.gguf',
    description:
      "Meta's compact Llama model. Noticeably better instruction-following for mid-range phones.",
    repoUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    minRamGB: 4,
  },
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5 1.5B Instruct',
    tier: 'medium',
    params: '1.5B',
    quant: 'Q4_K_M',
    sizeBytes: 1117320736,
    fileName: 'qwen2.5-1.5b.gguf',
    description:
      'Strong reasoning-to-size ratio. A great sweet spot for everyday chat on mid-range phones.',
    repoUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    minRamGB: 4,
  },
  {
    id: 'gemma2-2b',
    name: 'Gemma 2 2B Instruct',
    tier: 'medium',
    params: '2B',
    quant: 'Q4_K_M',
    sizeBytes: 1708582752,
    fileName: 'gemma2-2b.gguf',
    description:
      "Google's Gemma 2, tuned for chat. Higher quality answers for phones with more RAM to spare.",
    repoUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    minRamGB: 6,
  },
  {
    id: 'qwen2.5-3b',
    name: 'Qwen2.5 3B Instruct',
    tier: 'strong',
    params: '3B',
    quant: 'Q4_K_M',
    sizeBytes: 2104932768,
    fileName: 'qwen2.5-3b.gguf',
    description:
      'One of the best small models available. For flagship phones with RAM to spare.',
    repoUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    minRamGB: 6,
  },
  {
    id: 'llama3.2-3b',
    name: 'Llama 3.2 3B Instruct',
    tier: 'strong',
    params: '3B',
    quant: 'Q4_K_M',
    sizeBytes: 2019377696,
    fileName: 'llama3.2-3b.gguf',
    description:
      "Meta's larger Llama model. Excellent quality and instruction-following on flagship hardware.",
    repoUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    minRamGB: 6,
  },
  // Vision-language models. All from ggml-org (the llama.cpp maintainers),
  // whose GGUF + mmproj pairs are the ones confirmed working with
  // llama.cpp's own multimodal tooling. mmproj (vision projector) files
  // stay at Q8_0/f16 even when the base model is quantized -- quantizing
  // the vision encoder visibly degrades image understanding, so these are
  // inherently larger than a same-size text model, not a mistake.
  {
    id: 'smolvlm-500m',
    name: 'SmolVLM 500M Instruct',
    tier: 'weak',
    params: '500M',
    quant: 'Q8_0',
    sizeBytes: 436806912,
    fileName: 'smolvlm-500m.gguf',
    description:
      'Smallest vision model available. Can describe images and answer simple visual questions on weaker phones.',
    repoUrl: 'https://huggingface.co/ggml-org/SmolVLM-500M-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/SmolVLM-500M-Instruct-Q8_0.gguf',
    minRamGB: 3,
    capability: 'vision',
    mmprojUrl:
      'https://huggingface.co/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/mmproj-SmolVLM-500M-Instruct-Q8_0.gguf',
    mmprojFileName: 'smolvlm-500m-mmproj.gguf',
    mmprojSizeBytes: 108783360,
  },
  {
    id: 'smolvlm2-2.2b',
    name: 'SmolVLM2 2.2B Instruct',
    tier: 'medium',
    params: '2.2B',
    quant: 'Q4_K_M',
    sizeBytes: 1112602656,
    fileName: 'smolvlm2-2.2b.gguf',
    description:
      'Noticeably sharper image understanding than the 500M model, while still fitting mid-range phones.',
    repoUrl: 'https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/SmolVLM2-2.2B-Instruct-Q4_K_M.gguf',
    minRamGB: 5,
    capability: 'vision',
    mmprojUrl:
      'https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-2.2B-Instruct-Q8_0.gguf',
    mmprojFileName: 'smolvlm2-2.2b-mmproj.gguf',
    mmprojSizeBytes: 592523200,
  },
  {
    id: 'qwen2.5-vl-3b',
    name: 'Qwen2.5-VL 3B Instruct',
    tier: 'strong',
    params: '3B',
    quant: 'Q4_K_M',
    sizeBytes: 1929901056,
    fileName: 'qwen2.5-vl-3b.gguf',
    description:
      "One of the best small vision models available. Reads text in images, describes scenes, and answers detailed visual questions.",
    repoUrl: 'https://huggingface.co/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf',
    minRamGB: 7,
    capability: 'vision',
    mmprojUrl:
      'https://huggingface.co/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/mmproj-Qwen2.5-VL-3B-Instruct-f16.gguf',
    mmprojFileName: 'qwen2.5-vl-3b-mmproj.gguf',
    mmprojSizeBytes: 1338428128,
  },
  {
    id: 'qwen2.5-vl-7b',
    name: 'Qwen2.5-VL 7B Instruct',
    tier: 'strong',
    params: '7B',
    quant: 'Q4_K_M',
    sizeBytes: 4683072032,
    fileName: 'qwen2.5-vl-7b.gguf',
    description:
      'The highest-quality vision model in this catalog. For flagship phones with RAM and storage to spare.',
    repoUrl: 'https://huggingface.co/ggml-org/Qwen2.5-VL-7B-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf',
    minRamGB: 10,
    capability: 'vision',
    mmprojUrl:
      'https://huggingface.co/ggml-org/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/mmproj-Qwen2.5-VL-7B-Instruct-f16.gguf',
    mmprojFileName: 'qwen2.5-vl-7b-mmproj.gguf',
    mmprojSizeBytes: 1354162912,
  },
];

export const getModelById = (id: string): ModelInfo | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

export const TIER_LABEL: Record<string, string> = {
  weak: 'Weak Phones',
  medium: 'Medium Phones',
  strong: 'Strong Phones',
};
