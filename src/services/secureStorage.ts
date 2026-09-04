import * as Keychain from 'react-native-keychain';

/**
 * Thin wrapper over react-native-keychain (OS-level secure storage --
 * Android Keystore / iOS Keychain), used for anything more sensitive than
 * a plain settings toggle: the Hugging Face token and, later, search
 * provider API keys. Each secret is stored under its own `service` name so
 * multiple secrets don't collide; `username` is unused (fixed placeholder)
 * since these are single-value secrets, not username/password pairs.
 */
const PLACEHOLDER_USERNAME = 'pocketpal';

export async function setSecret(service: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(PLACEHOLDER_USERNAME, value, {service});
}

export async function getSecret(service: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({service});
  if (!result) {
    return null;
  }
  return result.password;
}

export async function clearSecret(service: string): Promise<void> {
  await Keychain.resetGenericPassword({service});
}

export const SECRET_SERVICE = {
  hfToken: 'pocketpal.hf_token',
  braveApiKey: 'pocketpal.brave_api_key',
};
