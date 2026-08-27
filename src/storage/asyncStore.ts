import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingSeen: 'pocketpal:onboarding_seen',
  conversations: 'pocketpal:conversations',
  downloadedModels: 'pocketpal:downloaded_models',
  conversationMessages: (conversationId: string) =>
    `pocketpal:conversation:${conversationId}`,
};

export {KEYS};

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function hasSeenOnboarding(): Promise<boolean> {
  return getJSON<boolean>(KEYS.onboardingSeen, false);
}

export async function setOnboardingSeen(): Promise<void> {
  await setJSON(KEYS.onboardingSeen, true);
}
