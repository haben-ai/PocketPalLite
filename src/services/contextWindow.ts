import {ChatMessage} from '../types';

/**
 * Single source of truth for the model context window, shared by
 * llamaSession.ts (n_ctx) and truncateMessagesToContext below. Kept at the
 * existing 2048 default so Phase 1 doesn't change memory consumption.
 */
export const DEFAULT_CONTEXT_SIZE = 2048;

/**
 * Tokens reserved for the model's own reply, mirroring the n_predict used
 * for completion() calls today.
 */
const RESPONSE_TOKEN_RESERVE = 512;

/** Rough allowance for chat-template wrapping (role markers, etc). */
const PROMPT_OVERHEAD_TOKENS = 64;

/**
 * Conservative, runtime-independent token estimate. Real tokenization needs
 * an async call into the loaded model (context.tokenize()), which would tie
 * this pure helper to a specific engine and require a native round trip per
 * candidate message while trimming. ~4 characters/token is a standard rough
 * estimate for English/Latin-script BPE vocabularies.
 *
 * Known limitation: many African-language scripts and other non-Latin text
 * tokenize less efficiently than this ratio, so this estimate under-counts
 * for that text. It's conservative for the current English/Latin-script
 * usage; it should be revisited once translation introduces more non-Latin
 * text into the prompt.
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * Flat per-image token-cost estimate for vision models. Real vision-token
 * cost varies by model and image resolution (typically hundreds to a couple
 * thousand tokens once encoded) and isn't knowable without the model itself
 * -- this is a deliberately conservative placeholder, same spirit as the
 * char-based text estimate above, biased toward trimming text history more
 * aggressively rather than risking a context overflow from an attached image.
 */
const IMAGE_TOKEN_ESTIMATE = 700;

function estimateMessageTokens(msg: ChatMessage): number {
  const textTokens = Math.ceil(msg.content.length / CHARS_PER_TOKEN_ESTIMATE);
  const imageTokens = msg.imagePath ? IMAGE_TOKEN_ESTIMATE : 0;
  return textTokens + imageTokens;
}

/**
 * Exposed so callers can size a fixed prefix (e.g. the persona system
 * prompt in ChatScreen.tsx) against the same heuristic used for history,
 * and pass it in as `reservedTokens` below rather than it silently eating
 * into the truncation budget unaccounted for.
 */
export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Selects a suffix of `messages` that should comfortably fit the model's
 * context window, keeping the newest messages and always including the
 * latest one. Does not mutate the input and never touches persisted
 * storage -- callers are expected to still persist the full, untruncated
 * message list; only what's sent to the model is trimmed.
 */
export function truncateMessagesToContext(
  messages: ChatMessage[],
  contextSize: number = DEFAULT_CONTEXT_SIZE,
  reservedTokens = 0,
): ChatMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const budget = Math.max(
    0,
    contextSize - RESPONSE_TOKEN_RESERVE - PROMPT_OVERHEAD_TOKENS - reservedTokens,
  );

  const result: ChatMessage[] = [];
  let used = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const cost = estimateMessageTokens(msg);

    if (result.length === 0) {
      // Always keep at least the newest message, even if it alone exceeds
      // the remaining budget -- there is nothing safer to send instead.
      result.unshift(msg);
      used += cost;
      continue;
    }

    if (used + cost > budget) {
      break;
    }

    result.unshift(msg);
    used += cost;
  }

  return result;
}
