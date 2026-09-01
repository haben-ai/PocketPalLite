import {Persona} from '../types';
import {getJSON, setJSON, KEYS} from './asyncStore';
import {
  ASSISTANT_NAME,
  BUILT_IN_PERSONA_ID,
  COMPANY_NAME,
  SYSTEM_PROMPT,
} from '../data/persona';

export async function getPersonas(): Promise<Persona[]> {
  return getJSON<Persona[]>(KEYS.personas, []);
}

export async function getPersona(id: string): Promise<Persona | undefined> {
  const all = await getPersonas();
  return all.find(p => p.id === id);
}

export async function createPersona(
  input: Omit<Persona, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>,
): Promise<Persona> {
  const now = Date.now();
  const persona: Persona = {
    ...input,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  };
  const all = await getPersonas();
  await setJSON(KEYS.personas, [...all, persona]);
  return persona;
}

export async function updatePersona(
  id: string,
  patch: Partial<Omit<Persona, 'id' | 'isBuiltIn'>>,
): Promise<void> {
  const all = await getPersonas();
  const next = all.map(p =>
    p.id === id ? {...p, ...patch, updatedAt: Date.now()} : p,
  );
  await setJSON(KEYS.personas, next);
}

/**
 * The built-in Riya/MustaAI persona can be edited (e.g. its system prompt
 * tuned) but never deleted -- conversations always need at least one
 * persona to fall back to. No-ops rather than throwing so callers (a
 * delete-confirmation flow) don't need a try/catch for the expected case.
 */
export async function deletePersona(id: string): Promise<void> {
  if (id === BUILT_IN_PERSONA_ID) {
    return;
  }
  const all = await getPersonas();
  await setJSON(
    KEYS.personas,
    all.filter(p => p.id !== id),
  );
}

/**
 * Idempotent boot-time migration: ensures the seeded Riya/MustaAI persona
 * exists, constructing it from data/persona.ts's constants on first run
 * (new install) or upgrade (existing install that predates the AIPals
 * persona system). Mirrors downloadManager.ts's
 * migrateLegacyModelIfPresent() pattern.
 */
export async function ensureBuiltInPersonaSeeded(): Promise<Persona> {
  const all = await getPersonas();
  const existing = all.find(p => p.id === BUILT_IN_PERSONA_ID);
  if (existing) {
    return existing;
  }
  const now = Date.now();
  const seeded: Persona = {
    id: BUILT_IN_PERSONA_ID,
    name: ASSISTANT_NAME,
    tagline: `${COMPANY_NAME}'s default assistant`,
    avatarEmoji: '🌸',
    systemPrompt: SYSTEM_PROMPT,
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  };
  await setJSON(KEYS.personas, [...all, seeded]);
  return seeded;
}
