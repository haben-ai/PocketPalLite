// @fugood/react-native-audio-pcm-stream ships an index.d.ts that declares a
// differently named ambient module, so it isn't usable under its real name.
declare module '@fugood/react-native-audio-pcm-stream' {
  export interface AudioStreamOptions {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    audioSource?: number;
    wavFile: string;
    bufferSize?: number;
  }

  const LiveAudioStream: {
    init: (options: AudioStreamOptions) => void;
    start: () => void;
    stop: () => Promise<string>;
    on: (event: 'data', callback: (base64Pcm: string) => void) => void;
  };

  export default LiveAudioStream;
}
