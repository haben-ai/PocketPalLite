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
];

export const getModelById = (id: string): ModelInfo | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

export const TIER_LABEL: Record<string, string> = {
  weak: 'Weak Phones',
  medium: 'Medium Phones',
  strong: 'Strong Phones',
};
