/**
 * The built-in default AI persona's display name. Previously hardcoded to
 * a fictional "Riya" identity backed by a system prompt that explicitly
 * instructed the model to conceal its real underlying model/architecture
 * and claim it was built by a company ("MustaAI") that had nothing to do
 * with it if asked. Removed per explicit request -- the app doesn't force
 * the model into a fake identity or instruct it to misrepresent itself.
 */
export const ASSISTANT_NAME = 'Assistant';

/**
 * Internal storage key only -- never shown to the user. Left unchanged
 * (rather than renamed to match the new name above) so existing installs'
 * already-seeded persona, and any conversations that already reference it,
 * keep resolving correctly; storage/personas.ts::ensureBuiltInPersonaSeeded
 * heals the persona's *content* in place for upgrading users instead of
 * leaving the old branded text behind under a new id.
 */
export const BUILT_IN_PERSONA_ID = 'riya-mustaai-default';

/**
 * Prepended as a system message on every completion call (see
 * ChatScreen.tsx::runCompletion) -- never stored in persisted chat history,
 * since it's not user-visible content, just an instruction to the model.
 * Deliberately makes no claim about who built the underlying model and
 * doesn't instruct it to hide or lie about that -- users can still create
 * their own personas with a custom identity via AIPals if they want one.
 */
export const SYSTEM_PROMPT =
  'You are a helpful, honest AI assistant. Answer clearly and directly, and stay honest about what you do and don\'t know.';
