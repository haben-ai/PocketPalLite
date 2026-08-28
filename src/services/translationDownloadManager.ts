import RNFS from 'react-native-fs';
import {TranslationModelInfo} from '../types';
import {downloadToFile, getFreeStorageBytes} from './downloadManager';
import {registerDownloadedTranslationModel} from '../storage/translationModelRegistry';

const TRANSLATION_MODELS_DIR = `${RNFS.DocumentDirectoryPath}/translation-models`;

async function ensureDir(): Promise<void> {
  const exists = await RNFS.exists(TRANSLATION_MODELS_DIR);
  if (!exists) {
    await RNFS.mkdir(TRANSLATION_MODELS_DIR);
  }
}

function filePathFor(modelId: string, fileName: string): string {
  return `${TRANSLATION_MODELS_DIR}/${modelId}-${fileName}`;
}

export type TranslationDownloadHandle = {
  cancel: () => void;
  completion: Promise<void>;
};

/**
 * Downloads the 4 files a translation model needs (encoder, decoder,
 * tokenizer.json, tokenizer_config.json) sequentially, reusing the same
 * single-file primitive (downloadToFile) the LLM downloader uses.
 * onProgress reports a single aggregated 0..1 fraction across all 4 files,
 * weighted by their (approximate) sizes.
 */
export function downloadTranslationModel(
  model: TranslationModelInfo,
  onProgress: (fraction: number) => void,
): TranslationDownloadHandle {
  let cancelled = false;
  let activeCancel: (() => void) | null = null;

  const files: Array<{url: string; fileName: string; sizeBytes: number}> = [
    {
      url: model.encoderUrl,
      fileName: 'encoder.onnx',
      sizeBytes: model.encoderSizeBytes,
    },
    {
      url: model.decoderUrl,
      fileName: 'decoder.onnx',
      sizeBytes: model.decoderSizeBytes,
    },
    {url: model.tokenizerUrl, fileName: 'tokenizer.json', sizeBytes: 17_500_000},
    {
      url: model.tokenizerConfigUrl,
      fileName: 'tokenizer_config.json',
      sizeBytes: 1_000,
    },
  ];
  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

  const completion = (async () => {
    await ensureDir();

    const freeSpace = await getFreeStorageBytes();
    if (freeSpace < totalBytes * 1.05) {
      throw new Error(
        `Not enough free storage. Need ~${(totalBytes / 1e9).toFixed(
          1,
        )} GB, only ${(freeSpace / 1e9).toFixed(1)} GB free.`,
      );
    }

    let bytesDoneBefore = 0;
    const paths: Record<string, string> = {};

    for (const file of files) {
      if (cancelled) {
        throw new Error('Download cancelled');
      }
      const toFile = filePathFor(model.id, file.fileName);
      paths[file.fileName] = toFile;

      await new Promise<void>((resolve, reject) => {
        const handle = downloadToFile(file.url, toFile, fraction => {
          const doneBytes = bytesDoneBefore + fraction * file.sizeBytes;
          onProgress(Math.min(1, doneBytes / totalBytes));
        });
        activeCancel = handle.cancel;
        handle.completion.then(resolve, reject);
      });

      bytesDoneBefore += file.sizeBytes;
    }

    await registerDownloadedTranslationModel({
      modelId: model.id,
      encoderPath: paths['encoder.onnx'],
      decoderPath: paths['decoder.onnx'],
      tokenizerPath: paths['tokenizer.json'],
      tokenizerConfigPath: paths['tokenizer_config.json'],
      downloadedAt: Date.now(),
    });
  })();

  return {
    cancel: () => {
      cancelled = true;
      activeCancel?.();
    },
    completion,
  };
}

export async function deleteTranslationModelFiles(
  paths: string[],
): Promise<void> {
  for (const path of paths) {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  }
}
