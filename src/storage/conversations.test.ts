import {describe, it, expect, beforeEach, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {getConversations, getMessages, touchConversation} from './conversations';

describe('backward compatibility with pre-Phase-1 stored data', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads a conversation stored before the optional `language` field existed', async () => {
    // Shape written by the app before this phase -- no `language` key at all.
    const legacyConversation = {
      id: 'legacy-1',
      modelId: 'smollm2-135m',
      title: 'What is quadratic equation',
      createdAt: 1700000000000,
      updatedAt: 1700000001000,
    };
    await AsyncStorage.setItem(
      'pocketpal:conversations',
      JSON.stringify([legacyConversation]),
    );

    const conversations = await getConversations();

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject(legacyConversation);
    expect(conversations[0].language).toBeUndefined();
  });

  it('loads legacy persisted messages that predate any language metadata', async () => {
    const legacyMessages = [
      {id: 'm1', role: 'user', content: 'Hello', createdAt: 1700000000000},
      {
        id: 'm2',
        role: 'assistant',
        content: 'Hi, how can I help?',
        createdAt: 1700000001000,
      },
    ];
    await AsyncStorage.setItem(
      'pocketpal:conversation:legacy-1',
      JSON.stringify(legacyMessages),
    );

    const messages = await getMessages('legacy-1');

    expect(messages).toEqual(legacyMessages);
  });

  it('can still update a legacy conversation without requiring a language value', async () => {
    const legacyConversation = {
      id: 'legacy-2',
      modelId: 'smollm2-135m',
      title: 'New Chat',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    await AsyncStorage.setItem(
      'pocketpal:conversations',
      JSON.stringify([legacyConversation]),
    );

    await touchConversation('legacy-2', 'Updated title');
    const conversations = await getConversations();

    expect(conversations[0].title).toBe('Updated title');
    expect(conversations[0].language).toBeUndefined();
  });
});
