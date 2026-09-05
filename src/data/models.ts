import {ModelInfo} from '../types';

// Catalog replaced (per explicit request) to match a specific reference
// screenshot's model list. Every entry below was checked against
// huggingface.co's live API for the exact repo/file/size before being
// added -- none of these are guessed. Two models the reference showed
// ("Bonsai 8B"/"Bonsai 4B", from prism-ml) were deliberately left out: they
// are real, published models, but their GGUF files use a custom "Q1_0"
// 1-bit tensor packing that only prism-ml's own llama.cpp fork knows how
// to read (confirmed by grepping this app's bundled ggml for tensor
// types -- it only has the unrelated mainline `TQ1_0` ternary type, not
// prism-ml's format). Adding them would mean a multi-hundred-MB download
// that fails or produces garbage output on this app's actual engine.
export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'gemma3-1b',
    name: 'Gemma 3 1B Instruct',
    tier: 'weak',
    params: '1B',
    quant: 'Q4_K_M',
    sizeBytes: 806058240,
    fileName: 'gemma3-1b.gguf',
    description:
      "Google's Gemma 3, tuned for chat. The default recommendation -- a strong, well-rounded model that's still small and fast.",
    repoUrl: 'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf',
    minRamGB: 3,
  },
  {
    id: 'gemma3-1b-q8',
    name: 'Gemma 3 1B Instruct (Q8_0)',
    tier: 'weak',
    params: '1B',
    quant: 'Q8_0',
    sizeBytes: 1069306368,
    fileName: 'gemma3-1b-q8.gguf',
    description:
      'The same Gemma 3 1B at a higher-precision quantization -- slightly larger and slower, slightly more accurate.',
    repoUrl: 'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF',
    downloadUrl:
      'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q8_0.gguf',
    minRamGB: 3,
  },
  {
    id: 'phi4-mini',
    name: 'Phi-4 Mini Instruct',
    tier: 'strong',
    params: '3.8B',
    quant: 'Q4_K_S',
    sizeBytes: 2337733952,
    fileName: 'phi4-mini.gguf',
    description:
      "Microsoft's Phi-4 Mini. Strong reasoning for its size, tuned for chat and instruction-following.",
    repoUrl: 'https://huggingface.co/MaziyarPanahi/Phi-4-mini-instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/MaziyarPanahi/Phi-4-mini-instruct-GGUF/resolve/main/Phi-4-mini-instruct.Q4_K_S.gguf',
    minRamGB: 6,
  },
  {
    id: 'gemma3-4b',
    name: 'Gemma 3 4B Instruct',
    tier: 'strong',
    params: '4B',
    quant: 'Q4_K_S',
    sizeBytes: 2377793728,
    fileName: 'gemma3-4b.gguf',
    description:
      "Google's larger Gemma 3. Noticeably higher-quality answers than the 1B model, for flagship phones with RAM to spare.",
    repoUrl: 'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF',
    downloadUrl:
      'https://huggingface.co/MaziyarPanahi/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it.Q4_K_S.gguf',
    minRamGB: 6,
  },
  {
    id: 'gemma3n-e2b',
    name: 'Gemma 3n E2B Instruct',
    tier: 'strong',
    params: '2B (effective)',
    quant: 'Q6_K',
    sizeBytes: 4208594272,
    fileName: 'gemma3n-e2b.gguf',
    // Real caveat, not a guess: Gemma 3n is natively multimodal (text,
    // image, audio), but every published GGUF conversion checked (ggml-org,
    // unsloth, bartowski) ships text-only -- none include the vision/audio
    // tower. Listed here as text-only until a GGUF with that support
    // actually exists.
    description:
      "Google's Gemma 3n, an \"effective 2B\" model with a larger real footprint due to its multilingual vocabulary. Text-only in this GGUF build.",
    repoUrl: 'https://huggingface.co/unsloth/gemma-3n-E2B-it-GGUF',
    downloadUrl:
      'https://huggingface.co/unsloth/gemma-3n-E2B-it-GGUF/resolve/main/gemma-3n-E2B-it-Q6_K.gguf',
    minRamGB: 7,
  },
];

export const getModelById = (id: string): ModelInfo | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

export const TIER_LABEL: Record<string, string> = {
  weak: 'Weak Phones',
  medium: 'Medium Phones',
  strong: 'Strong Phones',
};
