import {ChatMessage, Conversation} from '../types';
import {getJSON, setJSON, removeKey, KEYS} from './asyncStore';
import {BUILT_IN_PERSONA_ID} from '../data/persona';

export async function getConversations(): Promise<Conversation[]> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversationsForModel(
  modelId: string,
): Promise<Conversation[]> {
  const all = await getConversations();
  return all.filter(c => c.modelId === modelId);
}

export async function createConversation(
  modelId: string,
  personaId: string = BUILT_IN_PERSONA_ID,
): Promise<Conversation> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  const conversation: Conversation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    modelId,
    personaId,
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setJSON(KEYS.conversations, [...all, conversation]);
  return conversation;
}

export async function touchConversation(
  conversationId: string,
  title?: string,
): Promise<void> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  const next = all.map(c =>
    c.id === conversationId
      ? {...c, updatedAt: Date.now(), title: title ?? c.title}
      : c,
  );
  await setJSON(KEYS.conversations, next);
}

/**
 * Switches which model a conversation continues with (the Gemini-style
 * model switcher in ChatScreen). The full message history is already
 * resent to whichever model is active on every turn, so this alone is
 * enough to carry the visible conversation forward under the new model.
 */
export async function updateConversationModel(
  conversationId: string,
  modelId: string,
): Promise<void> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  const next = all.map(c =>
    c.id === conversationId ? {...c, modelId, updatedAt: Date.now()} : c,
  );
  await setJSON(KEYS.conversations, next);
}

/**
 * Switches which persona's system prompt a conversation continues with,
 * mirroring updateConversationModel exactly.
 */
export async function updateConversationPersona(
  conversationId: string,
  personaId: string,
): Promise<void> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  const next = all.map(c =>
    c.id === conversationId ? {...c, personaId, updatedAt: Date.now()} : c,
  );
  await setJSON(KEYS.conversations, next);
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const all = await getJSON<Conversation[]>(KEYS.conversations, []);
  await setJSON(
    KEYS.conversations,
    all.filter(c => c.id !== conversationId),
  );
  await removeKey(KEYS.conversationMessages(conversationId));
}

export async function getMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  return getJSON<ChatMessage[]>(KEYS.conversationMessages(conversationId), []);
}

export async function saveMessages(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  await setJSON(KEYS.conversationMessages(conversationId), messages);
}

export function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, ' ');
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed || 'New Chat';
}
