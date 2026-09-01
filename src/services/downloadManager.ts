import RNFS from 'react-native-fs';
import {ModelInfo} from '../types';
import {registerDownloadedModel} from '../storage/modelRegistry';

const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export async function ensureModelsDir(): Promise<void> {
  const exists = await RNFS.exists(MODELS_DIR);
  if (!exists) {
    await RNFS.mkdir(MODELS_DIR);
  }
}

export function modelFilePath(model: ModelInfo): string {
  return `${MODELS_DIR}/${model.fileName}`;
}

export function mmprojFilePath(model: ModelInfo): string | undefined {
  return model.mmprojFileName ? `${MODELS_DIR}/${model.mmprojFileName}` : undefined;
}

export async function getFreeStorageBytes(): Promise<number> {
  const info = await RNFS.getFSInfo();
  return info.freeSpace;
}

export type DownloadHandle = {
  cancel: () => void;
  completion: Promise<void>;
};

/**
 * Low-level single-file download primitive, reused by both the LLM
 * downloadModel() below and the translation model downloader
 * (translationDownloadManager.ts) -- deliberately has no free-space check
 * or registry side effects, since the translation downloader needs to
 * aggregate progress/space checks across multiple files, not one.
 */
export function downloadToFile(
  url: string,
  toFile: string,
  onProgress: (fraction: number, bytesWritten: number) => void,
): DownloadHandle {
  const {jobId, promise} = RNFS.downloadFile({
    fromUrl: url,
    toFile,
    progressDivider: 2,
    begin: () => {
      onProgress(0, 0);
    },
    progress: res => {
      const fraction =
        res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0;
      onProgress(fraction, res.bytesWritten);
    },
  });

  const completion = promise.then(async result => {
    if (result.statusCode && result.statusCode >= 400) {
      await RNFS.unlink(toFile).catch(() => undefined);
      throw new Error(`Download failed with status ${result.statusCode}`);
    }
  });

  return {
    cancel: () => RNFS.stopDownload(jobId),
    completion,
  };
}

export async function downloadModel(
  model: ModelInfo,
  onProgress: (fraction: number, bytesWritten: number) => void,
): Promise<DownloadHandle> {
  await ensureModelsDir();

  const totalBytes = model.sizeBytes + (model.mmprojSizeBytes ?? 0);
  const freeSpace = await getFreeStorageBytes();
  if (freeSpace < totalBytes * 1.05) {
    throw new Error(
      `Not enough free storage. Need ~${(totalBytes / 1e9).toFixed(
        1,
      )} GB, only ${(freeSpace / 1e9).toFixed(1)} GB free.`,
    );
  }

  const toFile = modelFilePath(model);
  const mmprojTarget = mmprojFilePath(model);

  let cancelled = false;
  let activeCancel: (() => void) | null = null;

  const completion = (async () => {
    // Base model file. When there's no mmproj, this is the whole download,
    // so its progress maps 1:1 onto the reported fraction.
    await new Promise<void>((resolve, reject) => {
      const baseHandle = downloadToFile(model.downloadUrl, toFile, fraction => {
        const baseShare = model.sizeBytes / totalBytes;
        onProgress(fraction * baseShare, fraction * model.sizeBytes);
      });
      activeCancel = baseHandle.cancel;
      baseHandle.completion.then(resolve, reject);
    });
    if (cancelled) {
      throw new Error('Download cancelled');
    }

    // Vision models additionally need the mmproj (vision projector) file,
    // downloaded second so the two files' progress can be aggregated into
    // one bar rather than showing two separate downloads to the user.
    if (mmprojTarget && model.mmprojUrl) {
      await new Promise<void>((resolve, reject) => {
        const mmprojHandle = downloadToFile(
          model.mmprojUrl!,
          mmprojTarget,
          fraction => {
            const baseShare = model.sizeBytes / totalBytes;
            const mmprojShare = model.mmprojSizeBytes! / totalBytes;
            onProgress(
              baseShare + fraction * mmprojShare,
              model.sizeBytes + fraction * model.mmprojSizeBytes!,
            );
          },
        );
        activeCancel = mmprojHandle.cancel;
        mmprojHandle.completion.then(resolve, reject);
      });
      if (cancelled) {
        throw new Error('Download cancelled');
      }
    }

    await registerDownloadedModel({
      modelId: model.id,
      filePath: toFile,
      sizeBytes: model.sizeBytes,
      downloadedAt: Date.now(),
      isCustomImport: false,
      displayName: model.name,
      mmprojPath: mmprojTarget,
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

export async function deleteDownloadedModel(filePath: string): Promise<void> {
  const exists = await RNFS.exists(filePath);
  if (exists) {
    await RNFS.unlink(filePath);
  }
}

/**
 * One-time migration: the original MVP build downloaded the SmolLM2 135M
 * model directly to DocumentDirectoryPath/smollm2.gguf. Move it into the
 * managed models/ folder and register it, so it doesn't need re-downloading.
 */
export async function migrateLegacyModelIfPresent(
  legacyModel: ModelInfo,
): Promise<void> {
  const legacyPath = `${RNFS.DocumentDirectoryPath}/smollm2.gguf`;
  const legacyExists = await RNFS.exists(legacyPath);
  if (!legacyExists) {
    return;
  }
  await ensureModelsDir();
  const targetPath = modelFilePath(legacyModel);
  const targetExists = await RNFS.exists(targetPath);
  if (!targetExists) {
    await RNFS.moveFile(legacyPath, targetPath);
    await registerDownloadedModel({
      modelId: legacyModel.id,
      filePath: targetPath,
      sizeBytes: legacyModel.sizeBytes,
      downloadedAt: Date.now(),
      isCustomImport: false,
      displayName: legacyModel.name,
    });
  } else {
    await RNFS.unlink(legacyPath).catch(() => undefined);
  }
}

export async function importLocalModel(
  sourceUri: string,
  fileName: string,
): Promise<{filePath: string; sizeBytes: number}> {
  await ensureModelsDir();
  const safeName = fileName.endsWith('.gguf') ? fileName : `${fileName}.gguf`;
  const targetPath = `${MODELS_DIR}/imported-${Date.now()}-${safeName}`;
  await RNFS.copyFile(sourceUri, targetPath);
  const stat = await RNFS.stat(targetPath);
  return {filePath: targetPath, sizeBytes: Number(stat.size)};
}
