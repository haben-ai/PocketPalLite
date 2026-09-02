import {Share} from 'react-native';
import RNFS from 'react-native-fs';
import {ChatMessage, Conversation} from '../types';
import {
  createConversation,
  getMessages,
  saveMessages,
  touchConversation,
} from '../storage/conversations';

export type ConversationExportPayload = {
  version: 1;
  exportedAt: number;
  modelId: string;
  personaId?: string;
  title: string;
  messages: ChatMessage[];
};

/**
 * Shares the conversation as JSON text via the OS share sheet (Save to
 * Files, email, messaging, etc. -- whatever the user picks). Deliberately
 * not a file:// attachment: Android's scoped storage/FileProvider rules
 * would need AndroidManifest changes to share a written file reliably,
 * whereas Share.share({message}) works everywhere with zero native config.
 */
export async function exportConversation(conversation: Conversation): Promise<void> {
  const messages = await getMessages(conversation.id);
  const payload: ConversationExportPayload = {
    version: 1,
    exportedAt: Date.now(),
    modelId: conversation.modelId,
    personaId: conversation.personaId,
    title: conversation.title,
    messages,
  };
  await Share.share({
    title: conversation.title,
    message: JSON.stringify(payload, null, 2),
  });
}

export function parseConversationExport(raw: string): ConversationExportPayload {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray(data.messages) ||
    typeof data.modelId !== 'string'
  ) {
    throw new Error('Not a valid AIPal conversation export file.');
  }
  return data as ConversationExportPayload;
}

/** Imports a picked file as a brand-new conversation, returning its id. */
export async function importConversationFromUri(uri: string): Promise<string> {
  const raw = await RNFS.readFile(uri, 'utf8');
  const payload = parseConversationExport(raw);
  const conversation = await createConversation(payload.modelId, payload.personaId);
  await saveMessages(conversation.id, payload.messages);
  await touchConversation(conversation.id, payload.title || undefined);
  return conversation.id;
}
