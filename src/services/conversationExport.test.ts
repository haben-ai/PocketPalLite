import {describe, it, expect} from '@jest/globals';
import {parseConversationExport} from './conversationExport';

describe('parseConversationExport', () => {
  it('parses a well-formed export payload', () => {
    const raw = JSON.stringify({
      version: 1,
      exportedAt: 1700000000000,
      modelId: 'smollm2-135m',
      personaId: 'riya-mustaai-default',
      title: 'Hello',
      messages: [{id: '1', role: 'user', content: 'hi', createdAt: 1700000000000}],
    });

    const payload = parseConversationExport(raw);

    expect(payload.modelId).toBe('smollm2-135m');
    expect(payload.messages).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseConversationExport('not json')).toThrow('not valid JSON');
  });

  it('rejects JSON missing a messages array', () => {
    expect(() => parseConversationExport(JSON.stringify({modelId: 'x'}))).toThrow(
      'Not a valid AIPal conversation export file.',
    );
  });

  it('rejects JSON missing a modelId', () => {
    expect(() => parseConversationExport(JSON.stringify({messages: []}))).toThrow(
      'Not a valid AIPal conversation export file.',
    );
  });
});
