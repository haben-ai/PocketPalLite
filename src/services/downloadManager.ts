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

/** Thrown when cancel() stopped the download -- lets callers tell "the
 * user gave up on this" apart from a real transfer/verification failure. */
export class DownloadCancelledError extends Error {
  constructor() {
    super('Download cancelled');
    this.name = 'DownloadCancelledError';
  }
}

/** Thrown when the downloaded file's real SHA-256 doesn't match the
 * manifest's expected value -- a content problem, not a transient network
 * one, so callers should surface this directly rather than retry it. */
export class ChecksumMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`Downloaded file did not match the expected checksum (expected ${expected}, got ${actual}).`);
    this.name = 'ChecksumMismatchError';
  }
}

export type DownloadHandle = {
  cancel: () => void;
  completion: Promise<void>;
};

// Kept deliberately short: a real network failure is either transient (a
// couple of retries clears it) or persistent (retrying more just delays
// the same failure) -- this isn't trying to paper over a genuinely broken
// connection, just absorb a dropped packet or a momentary blip.
const RETRY_DELAYS_MS = [2000, 8000];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Low-level single-file download primitive, reused by both the LLM
 * downloadModel() below and the translation model downloader
 * (translationDownloadManager.ts) via the shared download queue
 * (downloadQueue.ts). Downloads straight to `${toFile}.part` via RNFS's
 * native downloadFile (streams to disk, never through the JS bridge);
 * retries a failed attempt up to twice with backoff (each retry restarts
 * the file from byte 0 -- RNFS has no Range-resume primitive, so this
 * deliberately doesn't pretend to support pausing mid-transfer and
 * continuing later, only a clean cancel). Once the transfer succeeds, if
 * `sha256` is given the file is hashed natively (RNFS.hash -- streams the
 * file on the native side, never loads it into JS memory) and verified
 * before the atomic-ish unlink+move from `.part` to the final path; a
 * mismatch deletes `.part` and throws ChecksumMismatchError instead of
 * registering a corrupt file as usable.
 */
export function downloadToFile(
  url: string,
  toFile: string,
  onProgress: (fraction: number, bytesWritten: number) => void,
  headers?: Record<string, string>,
  sha256?: string,
): DownloadHandle {
  const partPath = `${toFile}.part`;

  let cancelled = false;
  let activeJobId: number | null = null;

  const completion = (async () => {
    for (let attempt = 0; ; attempt++) {
      if (cancelled) {
        throw new DownloadCancelledError();
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const {jobId, promise} = RNFS.downloadFile({
            fromUrl: url,
            toFile: partPath,
            headers,
            progressDivider: 2,
            begin: () => onProgress(0, 0),
            progress: res => {
              const fraction = res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0;
              onProgress(fraction, res.bytesWritten);
            },
          });
          activeJobId = jobId;
          promise.then(
            result => {
              activeJobId = null;
              if (result.statusCode && result.statusCode >= 400) {
                reject(new Error(`Download failed with status ${result.statusCode}`));
              } else {
                resolve();
              }
            },
            err => {
              activeJobId = null;
              reject(err);
            },
          );
        });
        break;
      } catch (err) {
        await RNFS.unlink(partPath).catch(() => undefined);
        if (cancelled) {
          throw new DownloadCancelledError();
        }
        if (attempt >= RETRY_DELAYS_MS.length) {
          throw err;
        }
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    if (sha256) {
      const digest = await RNFS.hash(partPath, 'sha256');
      if (digest.toLowerCase() !== sha256.toLowerCase()) {
        await RNFS.unlink(partPath).catch(() => undefined);
        throw new ChecksumMismatchError(sha256, digest);
      }
    }

    await RNFS.unlink(toFile).catch(() => undefined);
    await RNFS.moveFile(partPath, toFile);
  })();

  return {
    cancel: () => {
      cancelled = true;
      if (activeJobId !== null) {
        RNFS.stopDownload(activeJobId);
      }
    },
    completion: completion.catch(async err => {
      await RNFS.unlink(partPath).catch(() => undefined);
      throw err;
    }),
  };
}

export async function downloadModel(
  model: ModelInfo,
  onProgress: (fraction: number, bytesWritten: number) => void,
  headers?: Record<string, string>,
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
      const baseHandle = downloadToFile(
        model.downloadUrl,
        toFile,
        fraction => {
          const baseShare = model.sizeBytes / totalBytes;
          onProgress(fraction * baseShare, fraction * model.sizeBytes);
        },
        headers,
        model.sha256,
      );
      activeCancel = baseHandle.cancel;
      baseHandle.completion.then(resolve, reject);
    });
    if (cancelled) {
      throw new DownloadCancelledError();
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
          headers,
          model.mmprojSha256,
        );
        activeCancel = mmprojHandle.cancel;
        mmprojHandle.completion.then(resolve, reject);
      });
      if (cancelled) {
        throw new DownloadCancelledError();
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

function sanitizeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return (safe || 'model').slice(0, 60);
}

/**
 * Downloads an arbitrary direct-download URL (a pasted "Add Remote Model"
 * link, or a resolved Hugging Face file URL from the in-app HF search) and
 * registers it exactly like a local import -- same models/ folder, same
 * DownloadedModel registry entry, so it shows up in "Ready to Use" and
 * loads through the normal chat path. No catalog entry is created; this is
 * always isCustomImport: true. `modelId` is caller-generated (not derived
 * here) so the caller can key its download-progress state before this
 * promise resolves, matching how downloadModel()'s callers already key
 * progress by the catalog model's own id. No sha256 is available for an
 * arbitrary remote URL (there's no manifest entry to verify against), so
 * this path is integrity-checked only by the transfer succeeding, not by
 * a checksum -- consistent with it never having had one before.
 */
export async function downloadRemoteModel(
  modelId: string,
  url: string,
  displayName: string,
  onProgress: (fraction: number, bytesWritten: number) => void,
  headers?: Record<string, string>,
): Promise<DownloadHandle> {
  await ensureModelsDir();

  const toFile = `${MODELS_DIR}/${modelId}-${sanitizeFileName(displayName)}.gguf`;

  const handle = downloadToFile(url, toFile, onProgress, headers);

  const completion = handle.completion.then(async () => {
    const stat = await RNFS.stat(toFile);
    const sizeBytes = Number(stat.size);
    await registerDownloadedModel({
      modelId,
      filePath: toFile,
      sizeBytes,
      downloadedAt: Date.now(),
      isCustomImport: true,
      displayName,
    });
  });

  return {cancel: handle.cancel, completion};
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
