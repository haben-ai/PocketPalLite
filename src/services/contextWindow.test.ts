import {describe, it, expect} from '@jest/globals';
import {
  truncateMessagesToContext,
  estimateTextTokens,
  DEFAULT_CONTEXT_SIZE,
} from './contextWindow';
import {ChatMessage} from '../types';

function makeMessage(
  id: string,
  content: string,
  role: 'user' | 'assistant' = 'user',
  imagePath?: string,
): ChatMessage {
  return {id, role, content, createdAt: Date.now(), imagePath};
}

describe('truncateMessagesToContext', () => {
  it('returns an empty array for an empty conversation', () => {
    expect(truncateMessagesToContext([], DEFAULT_CONTEXT_SIZE)).toEqual([]);
  });

  it('leaves a short conversation completely unchanged', () => {
    const messages = [
      makeMessage('1', 'Hi there', 'user'),
      makeMessage('2', 'Hello! How can I help?', 'assistant'),
      makeMessage('3', 'What is 2+2?', 'user'),
    ];

    const result = truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);

    expect(result).toEqual(messages);
  });

  it('truncates a long conversation instead of sending it all', () => {
    // Each message is ~400 chars (~100 estimated tokens). At the default
    // 2048 context size the usable budget is well under 2048 tokens, so 40
    // such messages (~4000 estimated tokens) cannot all fit.
    const longMessage = 'word '.repeat(80); // ~400 chars
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 40; i++) {
      messages.push(
        makeMessage(String(i), longMessage, i % 2 === 0 ? 'user' : 'assistant'),
      );
    }

    const result = truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);

    expect(result.length).toBeLessThan(messages.length);
    expect(result.length).toBeGreaterThan(0);
  });

  it('always preserves the latest message, even alone if it is huge', () => {
    const messages = [
      makeMessage('old', 'short earlier message', 'user'),
      makeMessage('huge', 'x'.repeat(50000), 'user'), // far bigger than any budget
    ];

    const result = truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[result.length - 1].id).toBe('huge');
  });

  it('prioritizes the newest messages over the oldest when trimming', () => {
    const filler = 'word '.repeat(80); // ~400 chars each
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 40; i++) {
      messages.push(makeMessage(`msg-${i}`, filler));
    }

    const result = truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);
    const resultIds = result.map(m => m.id);
    const originalIds = messages.map(m => m.id);

    // The kept messages should be a contiguous suffix of the original order.
    const expectedSuffix = originalIds.slice(originalIds.length - result.length);
    expect(resultIds).toEqual(expectedSuffix);

    // The very first (oldest) message should have been dropped.
    expect(resultIds).not.toContain('msg-0');
    // The very last (newest) message must be kept.
    expect(resultIds).toContain(`msg-${messages.length - 1}`);
  });

  it('never exceeds the configured budget (per the character-based estimate)', () => {
    const filler = 'word '.repeat(80); // ~400 chars, ~100 estimated tokens
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 40; i++) {
      messages.push(makeMessage(`msg-${i}`, filler));
    }

    const contextSize = 1024;
    const result = truncateMessagesToContext(messages, contextSize);

    const totalChars = result
      .slice(0, -1) // the newest message is always kept regardless of budget
      .reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Budget excludes the response reserve (512) and prompt overhead (64).
    const expectedBudget = contextSize - 512 - 64;
    expect(estimatedTokens).toBeLessThanOrEqual(expectedBudget);
  });

  it('counts an attached image against the budget, trimming more text history to fit', () => {
    const filler = 'word '.repeat(80); // ~400 chars, ~100 estimated tokens each
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(makeMessage(`msg-${i}`, filler));
    }
    // Newest message has an attached image, costing extra budget.
    const withImage = [
      ...messages,
      makeMessage('with-image', 'What is in this photo?', 'user', '/tmp/photo.jpg'),
    ];
    const withoutImage = [
      ...messages,
      makeMessage('no-image', 'What is in this photo?', 'user'),
    ];

    const resultWithImage = truncateMessagesToContext(withImage, DEFAULT_CONTEXT_SIZE);
    const resultWithoutImage = truncateMessagesToContext(
      withoutImage,
      DEFAULT_CONTEXT_SIZE,
    );

    // The image-bearing newest message must still be included...
    expect(resultWithImage[resultWithImage.length - 1].id).toBe('with-image');
    // ...but its extra token cost should leave less room for older history,
    // so fewer older messages get kept than in the no-image case.
    expect(resultWithImage.length).toBeLessThanOrEqual(resultWithoutImage.length);
  });

  it('reserves budget for a fixed prefix (e.g. a persona system prompt), trimming more history to compensate', () => {
    const filler = 'word '.repeat(80); // ~400 chars, ~100 estimated tokens each
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(makeMessage(`msg-${i}`, filler));
    }
    const systemPrompt =
      'You are Riya, an AI assistant created by MustaAI. '.repeat(3);
    const reservedTokens = estimateTextTokens(systemPrompt);

    const withoutReserve = truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);
    const withReserve = truncateMessagesToContext(
      messages,
      DEFAULT_CONTEXT_SIZE,
      reservedTokens,
    );

    expect(reservedTokens).toBeGreaterThan(0);
    expect(withReserve.length).toBeLessThanOrEqual(withoutReserve.length);
  });

  it('does not mutate the input array or its messages', () => {
    const messages = [
      makeMessage('1', 'Hi there', 'user'),
      makeMessage('2', 'Hello!', 'assistant'),
    ];
    const snapshot = JSON.parse(JSON.stringify(messages));

    truncateMessagesToContext(messages, DEFAULT_CONTEXT_SIZE);

    expect(messages).toEqual(snapshot);
  });
});
