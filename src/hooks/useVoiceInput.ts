import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from '../components/AppDialog';
import {DownloadHandle} from '../services/downloadManager';
import {stopSpeaking} from '../services/ttsService';
import {
  MicPermissionError,
  SPEECH_MODEL,
  cancelRecording,
  downloadSpeechModel,
  isSpeechModelReady,
  startRecording,
  stopAndTranscribe,
} from '../services/speechToText';

export type VoiceState = 'idle' | 'downloading' | 'recording' | 'transcribing';

/**
 * Tap-to-talk voice input: first use offers the one-time speech-model
 * download, then tap starts the mic, tap again (or hitting the max length)
 * stops it, transcribes on-device, and hands the text to `onTranscript`.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [progress, setProgress] = useState(0);
  const downloadRef = useRef<DownloadHandle | null>(null);
  // Always the latest handler, so a transcript that lands seconds after the
  // tap isn't delivered to a stale closure from an earlier render.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const finishRef = useRef<() => Promise<void>>(async () => undefined);

  const finish = useCallback(async () => {
    setState('transcribing');
    try {
      const text = await stopAndTranscribe();
      if (text) {
        onTranscriptRef.current(text);
      } else {
        Alert.alert("Didn't catch that", 'Try again a little closer to the mic.');
      }
    } catch (err) {
      Alert.alert('Voice input failed', err instanceof Error ? err.message : String(err));
    } finally {
      setState('idle');
    }
  }, []);
  finishRef.current = finish;

  const begin = useCallback(async () => {
    try {
      // Silence the assistant first so it isn't recorded as the user.
      stopSpeaking();
      await startRecording(() => finishRef.current());
      setState('recording');
    } catch (err) {
      setState('idle');
      if (err instanceof MicPermissionError) {
        Alert.alert('Microphone needed', 'Allow microphone access in your phone settings to use voice input.');
      } else {
        Alert.alert('Voice input failed', err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  const download = useCallback(async () => {
    setState('downloading');
    setProgress(0);
    try {
      const handle = await downloadSpeechModel(setProgress);
      downloadRef.current = handle;
      await handle.completion;
      downloadRef.current = null;
      await begin();
    } catch (err) {
      downloadRef.current = null;
      setState('idle');
      Alert.alert('Download failed', err instanceof Error ? err.message : String(err));
    }
  }, [begin]);

  const toggle = useCallback(async () => {
    if (state === 'recording') {
      await finish();
      return;
    }
    if (state === 'downloading') {
      downloadRef.current?.cancel();
      return;
    }
    if (state !== 'idle') {
      return;
    }
    if (!(await isSpeechModelReady())) {
      Alert.alert(
        'Download voice model?',
        `Voice input runs entirely on your phone. It needs a one-time ${Math.round(
          SPEECH_MODEL.sizeBytes / 1e6,
        )} MB download.`,
        [
          {text: 'Not now', style: 'cancel'},
          {text: 'Download', onPress: () => download()},
        ],
      );
      return;
    }
    await begin();
  }, [state, finish, begin, download]);

  useEffect(
    () => () => {
      cancelRecording();
      downloadRef.current?.cancel();
    },
    [],
  );

  return {state, progress, toggle};
}
