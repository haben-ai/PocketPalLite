import {PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import {initWhisper, WhisperContext} from 'whisper.rn';
import {downloadToFile, DownloadHandle} from './downloadManager';

/**
 * Offline speech-to-text: audio is recorded from the mic into memory and
 * transcribed by whisper.cpp (via whisper.rn) entirely on-device -- nothing
 * is uploaded, and no OS speech recognizer (which on both platforms can
 * route audio to Apple's/Google's servers) is involved.
 */

// ggml-base, 5-bit quantized: ~60 MB, multilingual, a good accuracy/speed
// balance for short voice prompts on a phone. sha256 is the file's real
// git-lfs oid from Hugging Face's tree API (same discipline as
// data/models.ts) -- downloadToFile verifies it before the file is kept.
export const SPEECH_MODEL = {
  fileName: 'ggml-base-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  sizeBytes: 59707625,
  sha256: '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898',
};

const SAMPLE_RATE = 16000;
// 16-bit mono at 16 kHz = 32,000 bytes/s. Capped so a forgotten
// open mic can't grow the in-memory buffer without bound.
const MAX_RECORD_SECONDS = 60;
const MIN_RECORD_SECONDS = 0.6;
const MAX_BYTES = MAX_RECORD_SECONDS * SAMPLE_RATE * 2;
const MIN_BYTES = MIN_RECORD_SECONDS * SAMPLE_RATE * 2;

function speechDir(): string {
  return `${RNFS.DocumentDirectoryPath}/speech`;
}

function speechModelPath(): string {
  return `${speechDir()}/${SPEECH_MODEL.fileName}`;
}

export async function isSpeechModelReady(): Promise<boolean> {
  return RNFS.exists(speechModelPath());
}

export async function downloadSpeechModel(
  onProgress: (fraction: number) => void,
): Promise<DownloadHandle> {
  if (!(await RNFS.exists(speechDir()))) {
    await RNFS.mkdir(speechDir());
  }
  return downloadToFile(
    SPEECH_MODEL.url,
    speechModelPath(),
    fraction => onProgress(fraction),
    undefined,
    SPEECH_MODEL.sha256,
  );
}

export class MicPermissionError extends Error {
  constructor() {
    super('Microphone permission was denied.');
    this.name = 'MicPermissionError';
  }
}

async function ensureMicPermission(): Promise<void> {
  if (Platform.OS !== 'android') {
    // iOS prompts on first mic use, using NSMicrophoneUsageDescription.
    return;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new MicPermissionError();
  }
}

let context: WhisperContext | null = null;
let chunks: Uint8Array[] = [];
let recordedBytes = 0;
let recording = false;
let onLimit: (() => void) | null = null;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/** Starts capturing the mic. `onMaxLength` fires if the recording reaches
 * the cap, so the caller can stop and transcribe instead of silently
 * dropping the rest. */
export async function startRecording(onMaxLength?: () => void): Promise<void> {
  if (recording) {
    return;
  }
  await ensureMicPermission();
  chunks = [];
  recordedBytes = 0;
  onLimit = onMaxLength ?? null;
  LiveAudioStream.init({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION: tuned for speech, skips AGC music processing
    bufferSize: 4096,
    wavFile: '',
  });
  LiveAudioStream.on('data', (b64: string) => {
    if (!recording) {
      return;
    }
    const bytes = base64ToBytes(b64);
    chunks.push(bytes);
    recordedBytes += bytes.length;
    if (recordedBytes >= MAX_BYTES && onLimit) {
      const cb = onLimit;
      onLimit = null;
      cb();
    }
  });
  recording = true;
  LiveAudioStream.start();
}

/** Throws away the current recording without transcribing it. */
export async function cancelRecording(): Promise<void> {
  if (!recording) {
    return;
  }
  recording = false;
  onLimit = null;
  chunks = [];
  recordedBytes = 0;
  await LiveAudioStream.stop().catch(() => undefined);
}

/** Stops the mic and returns the transcript ('' if nothing intelligible
 * was said). The Whisper context is released afterward so its memory is
 * free again before the chat model needs it. */
export async function stopAndTranscribe(): Promise<string> {
  if (!recording) {
    return '';
  }
  recording = false;
  onLimit = null;
  await LiveAudioStream.stop().catch(() => undefined);

  const captured = chunks;
  const total = recordedBytes;
  chunks = [];
  recordedBytes = 0;
  if (total < MIN_BYTES) {
    return '';
  }

  const pcm = new Uint8Array(total);
  let offset = 0;
  for (const c of captured) {
    pcm.set(c, offset);
    offset += c.length;
  }

  try {
    if (!context) {
      context = await initWhisper({filePath: speechModelPath()});
    }
    const {promise} = context.transcribeData(pcm.buffer as ArrayBuffer, {language: 'auto'});
    const result = await promise;
    const text = result.result.trim();
    // Whisper reports silence/noise as bracketed tags like "[BLANK_AUDIO]"
    // or "(silence)" -- that's "nothing said", not something to send.
    return /^[[(].*[\])]$/.test(text) ? '' : text;
  } finally {
    const ctx = context;
    context = null;
    ctx?.release().catch(() => undefined);
  }
}
