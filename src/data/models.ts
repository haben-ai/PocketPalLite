import {ModelInfo} from '../types';

// Catalog replaced (per explicit request) to match a specific reference
// screenshot's model list. Every entry below was checked against
// huggingface.co's live API for the exact repo/file/size before being
// added -- none of these are guessed. Every sha256 below is the file's
// real git-lfs `oid` from HF's own tree API
// (GET /api/models/{repo}/tree/main), which *is* the file's SHA-256 --
// fetched directly, not computed or guessed, and cross-checked against
// each entry's already-verified sizeBytes as a sanity check (all matched
// exactly). downloadManager verifies a completed download's hash against
// this before the model is ever registered as usable. Several prism-ml
// "Bonsai" sizes (8B, 4B, and -- re-checked on request -- 1.7B too) were
// deliberately left out: they're real, published models, but every GGUF
// prism-ml ships (including the two files literally named "*-Q1_0.gguf"
// and "*.gguf" for 1.7B/4B, confirmed via HF's tree API to be
// byte-for-byte identical, same sha256) uses a custom "Q1_0" 1-bit tensor
// packing. That's not a real ggml tensor type -- this app's bundled ggml
// enum (node_modules/@pocketpalai/llama.rn/cpp/ggml.h) has no Q1_0 at all,
// only Q4_0/Q5_0/Q8_0 and the unrelated mainline ternary TQ1_0/TQ2_0 --
// only prism-ml's own llama.cpp fork can read it. Adding these would mean
// a multi-hundred-MB download that fails or produces garbage output on
// this app's actual engine.
export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'gemma3-1b',
    name: 'Gemma 3 1B Instruct',
    tier: 'weak',
    vendor: 'google',
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
    version: '1',
    sha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135',
  },
  {
    id: 'gemma3-1b-q8',
    name: 'Gemma 3 1B Instruct (Q8_0)',
    tier: 'weak',
    vendor: 'google',
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
    version: '1',
    sha256: 'b205840c5dcef55078e37d344677869a714ffd42a4ae448c48dcfb52e4bb10d5',
  },
  {
    id: 'phi4-mini',
    name: 'Phi-4 Mini Instruct',
    tier: 'strong',
    vendor: 'microsoft',
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
    version: '1',
    sha256: '5482cf4a772b948d8852d0b4d8541c5a07557e6b68d980c388f3f92bfddbc389',
  },
  {
    id: 'gemma3-4b',
    name: 'Gemma 3 4B Instruct',
    tier: 'strong',
    vendor: 'google',
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
    version: '1',
    sha256: 'd6415802e8158ff8db48568ead478f9eb39f28a3b5789bd367d2957d0d4b8421',
  },
  {
    id: 'gemma3n-e2b',
    name: 'Gemma 3n E2B Instruct',
    tier: 'strong',
    vendor: 'google',
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
    version: '1',
    sha256: 'd2422a66532f23c21c0ffd05d21ec05200c33009fad61402bb99125be34983c6',
  },
];

export const getModelById = (id: string): ModelInfo | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

export const TIER_LABEL: Record<string, string> = {
  weak: 'Weak Phones',
  medium: 'Medium Phones',
  strong: 'Strong Phones',
};
