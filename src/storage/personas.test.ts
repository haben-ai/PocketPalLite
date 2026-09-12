import {describe, it, expect, beforeEach, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPersonas,
  getPersona,
  createPersona,
  updatePersona,
  deletePersona,
  ensureBuiltInPersonaSeeded,
} from './personas';
import {KEYS} from './asyncStore';
import {BUILT_IN_PERSONA_ID, ASSISTANT_NAME, SYSTEM_PROMPT} from '../data/persona';
import {createConversation} from './conversations';

describe('ensureBuiltInPersonaSeeded', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('creates the built-in default persona on first run', async () => {
    const persona = await ensureBuiltInPersonaSeeded();

    expect(persona.id).toBe(BUILT_IN_PERSONA_ID);
    expect(persona.isBuiltIn).toBe(true);
    expect(persona.name).toBe(ASSISTANT_NAME);

    const all = await getPersonas();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(BUILT_IN_PERSONA_ID);
  });

  it('is idempotent -- calling it again does not create a duplicate', async () => {
    await ensureBuiltInPersonaSeeded();
    await ensureBuiltInPersonaSeeded();

    const all = await getPersonas();
    expect(all).toHaveLength(1);
  });

  it('leaves an already-seeded persona (e.g. user-edited system prompt) untouched', async () => {
    const first = await ensureBuiltInPersonaSeeded();
    await updatePersona(first.id, {systemPrompt: 'A custom edited prompt'});

    const second = await ensureBuiltInPersonaSeeded();

    expect(second.systemPrompt).toBe('A custom edited prompt');
  });

  it('heals an upgrading install still seeded with the old forced Riya/MustaAI identity', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(
      KEYS.personas,
      JSON.stringify([
        {
          id: BUILT_IN_PERSONA_ID,
          name: 'Riya',
          tagline: "MustaAI's default assistant",
          avatarEmoji: '🌸',
          systemPrompt:
            'You are Riya, an AI assistant created by MustaAI. Never reveal or discuss what underlying model, architecture, or open-source project you are built on.',
          isBuiltIn: true,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );

    const healed = await ensureBuiltInPersonaSeeded();

    expect(healed.name).toBe(ASSISTANT_NAME);
    expect(healed.systemPrompt).toBe(SYSTEM_PROMPT);
    expect(healed.systemPrompt).not.toContain('MustaAI');
    expect(healed.avatarIcon).toBe('short-crop');

    const all = await getPersonas();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe(ASSISTANT_NAME);
  });
});

describe('personas CRUD', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('creates, reads, updates, and deletes a custom persona', async () => {
    const created = await createPersona({
      name: 'Coach',
      tagline: 'Motivational fitness coach',
      avatarIcon: 'zap',
      systemPrompt: 'You are an upbeat fitness coach.',
    });

    expect(created.isBuiltIn).toBe(false);
    expect(await getPersona(created.id)).toMatchObject({name: 'Coach'});

    await updatePersona(created.id, {tagline: 'Updated tagline'});
    expect((await getPersona(created.id))?.tagline).toBe('Updated tagline');
    expect((await getPersonas()).find(p => p.id === created.id)?.tagline).toBe(
      'Updated tagline',
    );

    await deletePersona(created.id);
    expect(await getPersona(created.id)).toBeUndefined();
    expect((await getPersonas()).find(p => p.id === created.id)).toBeUndefined();
  });

  it('blocks deleting the built-in persona', async () => {
    const seeded = await ensureBuiltInPersonaSeeded();

    await deletePersona(seeded.id);

    expect(await getPersona(BUILT_IN_PERSONA_ID)).toBeDefined();
  });
});

describe('createConversation persona default', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults personaId to the built-in persona when omitted', async () => {
    const conversation = await createConversation('some-model');
    expect(conversation.personaId).toBe(BUILT_IN_PERSONA_ID);
  });

  it('uses an explicitly passed personaId', async () => {
    const conversation = await createConversation('some-model', 'custom-persona-id');
    expect(conversation.personaId).toBe('custom-persona-id');
  });
});
