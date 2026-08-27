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

export async function getFreeStorageBytes(): Promise<number> {
  const info = await RNFS.getFSInfo();
  return info.freeSpace;
}

export type DownloadHandle = {
  jobId: number;
  cancel: () => void;
  completion: Promise<void>;
};

export async function downloadModel(
  model: ModelInfo,
  onProgress: (fraction: number, bytesWritten: number) => void,
): Promise<DownloadHandle> {
  await ensureModelsDir();

  const freeSpace = await getFreeStorageBytes();
  if (freeSpace < model.sizeBytes * 1.05) {
    throw new Error(
      `Not enough free storage. Need ~${(model.sizeBytes / 1e9).toFixed(
        1,
      )} GB, only ${(freeSpace / 1e9).toFixed(1)} GB free.`,
    );
  }

  const toFile = modelFilePath(model);
  const {jobId, promise} = RNFS.downloadFile({
    fromUrl: model.downloadUrl,
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
    await registerDownloadedModel({
      modelId: model.id,
      filePath: toFile,
      sizeBytes: model.sizeBytes,
      downloadedAt: Date.now(),
      isCustomImport: false,
      displayName: model.name,
    });
  });

  return {
    jobId,
    cancel: () => RNFS.stopDownload(jobId),
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
