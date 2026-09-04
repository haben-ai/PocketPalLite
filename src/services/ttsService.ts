import Tts from 'react-native-tts';

let initialized = false;

async function ensureInit(): Promise<void> {
  if (initialized) {
    return;
  }
  try {
    await Tts.getInitStatus();
    initialized = true;
  } catch {
    // No TTS engine installed/ready -- speak() below will just no-op via
    // its own try/catch rather than throwing up into ChatScreen.
  }
}

/** Speaks text aloud via the device's own TTS engine (Android
 * TextToSpeech / iOS AVSpeechSynthesizer) -- fully on-device, no network
 * call, consistent with the rest of this app. Silently no-ops if no TTS
 * engine is available rather than surfacing an error for a non-essential
 * feature. */
export async function speak(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }
  await ensureInit();
  try {
    Tts.stop();
    Tts.speak(text);
  } catch {
    // Non-essential feature -- swallow.
  }
}

export function stopSpeaking(): void {
  try {
    Tts.stop();
  } catch {
    // Non-essential feature -- swallow.
  }
}
