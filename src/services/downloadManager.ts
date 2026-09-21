import RNFS from 'react-native-fs';
import {
  createDownloadTask,
  getExistingDownloadTasks,
  completeHandler,
} from '@kesha-antonov/react-native-background-downloader';
import type {DownloadTask as BgDownloadTask} from '@kesha-antonov/react-native-background-downloader';
import {ModelInfo} from '../types';
import {registerDownloadedModel} from '../storage/modelRegistry';

// A function, not a module-scope constant -- RNFS.DocumentDirectoryPath is a
// native-module property, and reading it at module-evaluation time means a
// broken/unlinked RNFS on some platform throws during the app's very first
// `require()` pass (before anything can render or catch it) instead of
// inside an awaitable, catchable async call.
function modelsDir(): string {
  return `${RNFS.DocumentDirectoryPath}/models`;
}

// Runs at most once per app session (ensureModelsDir() is called on every
// download start, not just at boot) -- readDir-ing the models folder on
// every single call would be wasted I/O for a check that's only ever
// relevant once, right after upgrading past the RNFS-to-background-
// downloader engine swap.
let stalePartFilesSwept = false;

/**
 * A `.part` file is exclusively the old RNFS-based engine's own atomic-write
 * convention (download-then-move) -- the new background-downloader engine
 * writes straight to a model's final path and never produces one. Any
 * `.part` file found here is therefore always a leftover from an in-flight
 * RNFS download that was still running the moment the app updated past that
 * engine swap: the new engine has no idea it exists and can't resume it, so
 * it's always safe (and correct) to just delete it. The queue item that was
 * pointing at it falls through to a fresh download under the new engine on
 * its own, the normal way an unrecognized/no-longer-existing job gets
 * requeued -- this never silently loses a *completed* download, only a
 * partial one that was already incomplete.
 */
async function sweepStalePartFiles(dir: string): Promise<void> {
  try {
    const entries = await RNFS.readDir(dir);
    await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.part'))
        .map(e => RNFS.unlink(e.path).catch(() => undefined)),
    );
  } catch {
    // Best-effort -- a failure here shouldn't block downloads from working.
  }
}

export async function ensureModelsDir(): Promise<void> {
  const dir = modelsDir();
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
    stalePartFilesSwept = true;
    return;
  }
  if (!stalePartFilesSwept) {
    stalePartFilesSwept = true;
    await sweepStalePartFiles(dir);
  }
}

export function modelFilePath(model: ModelInfo): string {
  return `${modelsDir()}/${model.fileName}`;
}

export function mmprojFilePath(model: ModelInfo): string | undefined {
  return model.mmprojFileName ? `${modelsDir()}/${model.mmprojFileName}` : undefined;
}

export async function getFreeStorageBytes(): Promise<number> {
  const info = await RNFS.getFSInfo();
  return info.freeSpace;
}

/**
 * A real reachability probe (a HEAD request to Hugging Face's own domain,
 * which is where every catalog/remote download actually comes from), not
 * just "is a radio turned on" -- deliberately not the
 * @react-native-community/netinfo package, since that would add a whole new
 * native dependency (+ native rebuild) for a check this cheap fetch already
 * answers more accurately (a phone can have Wi-Fi "connected" with no real
 * internet behind it, which NetInfo alone wouldn't catch). A short timeout
 * keeps this from hanging the UI on a dead connection.
 */
export async function hasInternetConnection(timeoutMs = 6000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://huggingface.co', {
      method: 'HEAD',
      signal: controller.signal,
    });
    // Any real HTTP response (even a 4xx) proves the network path works --
    // only a thrown network error (DNS failure, no route, timeout) means
    // there's genuinely no connection.
    return !!response;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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
  /** Only present on a handle backed by the background-downloader engine
   * (downloadModel/downloadRemoteModel) -- translation-model downloads
   * still use the RNFS-based downloadToFile() below, which has no true
   * Range-resume and so can't support pause/resume. */
  pause?: () => void;
  resume?: () => void;
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

/**
 * Runs one file through @kesha-antonov/react-native-background-downloader --
 * the engine used for LLM model downloads (catalog + remote-URL), chosen
 * over RNFS specifically because it has true byte-range resume and
 * OS-level background continuation (Android's system DownloadManager,
 * iOS's NSURLSession background config), unlike downloadToFile() above.
 *
 * `existingTask`, when given, is a task rediscovered via
 * getExistingDownloadTasks() on a cold relaunch -- reconnected instead of
 * created fresh. A cold relaunch's tasksMap starts empty, so its
 * begin/progress/done/error handlers are always gone and must be
 * re-registered here regardless of whether the task is new or resumed;
 * .start() is only ever called on a genuinely fresh task, since calling it
 * on a task already past PENDING fires an "already started" error instead
 * of a harmless no-op. A task discovered already 'DONE' (finished natively
 * while the app was killed, before anything could reconnect) resolves
 * immediately instead of waiting on a done() event that already fired once
 * and won't fire again. A reconnected task still sitting 'PAUSED' at the
 * native level (the app died mid-pause, or the OS itself paused it for a
 * network-constraint reason) gets an explicit resume() call -- calling
 * startJob() again for a job (whether that's the queue naturally reaching
 * it after a relaunch, or an explicit user Resume tap) always means "make
 * this actually transfer," never "just observe."
 *
 * No JS-side retry-with-backoff here (unlike downloadToFile()): a real
 * network blip is the OS-level engine's own problem to absorb (that's the
 * point of moving off RNFS), and a genuine failure should surface to the
 * queue's existing failed/Retry UI immediately rather than being silently
 * retried underneath it.
 */
function runEngineDownload(
  taskId: string,
  url: string,
  destination: string,
  onProgress: (fraction: number, bytesWritten: number) => void,
  headers: Record<string, string> | undefined,
  sha256: string | undefined,
  existingTask: BgDownloadTask | undefined,
): DownloadHandle {
  // Set by cancel() -- checked in the error handler below so a native
  // error event that's really just the consequence of our own stop() call
  // (cancelling) surfaces as DownloadCancelledError, not a generic failure.
  // Without this, tapping Cancel would show "Download failed" instead of
  // quietly removing the item, since stop() itself doesn't reject anything
  // -- whatever terminal event the native side fires next after it does.
  let stopped = false;
  let task: BgDownloadTask | undefined = existingTask;

  function attachAndWait(t: BgDownloadTask): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      t.progress(({bytesDownloaded, bytesTotal}) => {
        const fraction = bytesTotal > 0 ? bytesDownloaded / bytesTotal : 0;
        onProgress(fraction, bytesDownloaded);
      })
        .done(() => {
          // Required by the library's own iOS contract -- without this,
          // iOS throttles the app's future background transfer time,
          // since it's how the app tells the OS "I've fully handled this
          // background session event," not just an app-level bookkeeping
          // call.
          completeHandler(taskId);
          resolve();
        })
        .error(({error, errorCode}) => {
          completeHandler(taskId);
          if (stopped) {
            reject(new DownloadCancelledError());
          } else {
            reject(new Error(`Download failed (${errorCode}): ${error}`));
          }
        });
    });
  }

  const completion = (async () => {
    if (existingTask?.state === 'DONE') {
      onProgress(1, existingTask.bytesTotal);
      completeHandler(taskId);
    } else if (existingTask) {
      if (existingTask.bytesTotal > 0) {
        onProgress(existingTask.bytesDownloaded / existingTask.bytesTotal, existingTask.bytesDownloaded);
      }
      const wasPaused = existingTask.state === 'PAUSED';
      const wait = attachAndWait(existingTask);
      if (wasPaused) {
        existingTask.resume().catch(() => undefined);
      }
      await wait;
    } else {
      const freshTask = createDownloadTask({id: taskId, url, destination, headers});
      task = freshTask;
      const wait = attachAndWait(freshTask);
      freshTask.start();
      await wait;
    }

    if (sha256) {
      const digest = await RNFS.hash(destination, 'sha256');
      if (digest.toLowerCase() !== sha256.toLowerCase()) {
        await RNFS.unlink(destination).catch(() => undefined);
        throw new ChecksumMismatchError(sha256, digest);
      }
    }
  })();

  return {
    completion,
    cancel: () => {
      stopped = true;
      task?.stop().catch(() => undefined);
    },
    pause: () => {
      task?.pause().catch(() => undefined);
    },
    resume: () => {
      task?.resume().catch(() => undefined);
    },
  };
}

/** Looks up any live native tasks matching this job's id prefix -- called
 * once per downloadModel()/downloadRemoteModel() call (not per sub-file),
 * since getExistingDownloadTasks() is a single native round-trip covering
 * every in-flight task, not just this job's. */
async function findExistingTasksById(ids: string[]): Promise<Map<string, BgDownloadTask>> {
  const all = await getExistingDownloadTasks();
  const byId = new Map<string, BgDownloadTask>();
  for (const task of all) {
    if (ids.includes(task.id)) {
      byId.set(task.id, task);
    }
  }
  return byId;
}

export async function downloadModel(
  model: ModelInfo,
  onProgress: (fraction: number, bytesWritten: number) => void,
  headers: Record<string, string> | undefined,
  taskId: string,
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
  const baseTaskId = `${taskId}#base`;
  const mmprojTaskId = `${taskId}#mmproj`;

  // Checked once up front: if the mmproj task already exists, the base
  // phase necessarily already completed+verified in an earlier run of this
  // same job (mmproj is only ever started after base succeeds, below), so
  // it's skipped entirely rather than re-downloaded and re-verified.
  const existing = await findExistingTasksById([baseTaskId, mmprojTaskId]);
  const resumingMmproj = existing.has(mmprojTaskId);

  let cancelled = false;
  let activeCancel: (() => void) | null = null;
  let activePause: (() => void) | null = null;
  let activeResume: (() => void) | null = null;

  const completion = (async () => {
    if (!resumingMmproj) {
      // Base model file. When there's no mmproj, this is the whole
      // download, so its progress maps 1:1 onto the reported fraction.
      await new Promise<void>((resolve, reject) => {
        const baseHandle = runEngineDownload(
          baseTaskId,
          model.downloadUrl,
          toFile,
          fraction => {
            const baseShare = model.sizeBytes / totalBytes;
            onProgress(fraction * baseShare, fraction * model.sizeBytes);
          },
          headers,
          model.sha256,
          existing.get(baseTaskId),
        );
        activeCancel = baseHandle.cancel;
        activePause = baseHandle.pause ?? null;
        activeResume = baseHandle.resume ?? null;
        baseHandle.completion.then(resolve, reject);
      });
      if (cancelled) {
        throw new DownloadCancelledError();
      }
    }

    // Vision models additionally need the mmproj (vision projector) file,
    // downloaded second so the two files' progress can be aggregated into
    // one bar rather than showing two separate downloads to the user.
    if (mmprojTarget && model.mmprojUrl) {
      await new Promise<void>((resolve, reject) => {
        const mmprojHandle = runEngineDownload(
          mmprojTaskId,
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
          existing.get(mmprojTaskId),
        );
        activeCancel = mmprojHandle.cancel;
        activePause = mmprojHandle.pause ?? null;
        activeResume = mmprojHandle.resume ?? null;
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
    pause: () => activePause?.(),
    resume: () => activeResume?.(),
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
  headers: Record<string, string> | undefined,
  taskId: string,
): Promise<DownloadHandle> {
  await ensureModelsDir();

  const toFile = `${modelsDir()}/${modelId}-${sanitizeFileName(displayName)}.gguf`;

  const existing = await findExistingTasksById([taskId]);
  const handle = runEngineDownload(taskId, url, toFile, onProgress, headers, undefined, existing.get(taskId));

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

  return {cancel: handle.cancel, pause: handle.pause, resume: handle.resume, completion};
}

export async function importLocalModel(
  sourceUri: string,
  fileName: string,
): Promise<{filePath: string; sizeBytes: number}> {
  await ensureModelsDir();
  const safeName = fileName.endsWith('.gguf') ? fileName : `${fileName}.gguf`;
  const targetPath = `${modelsDir()}/imported-${Date.now()}-${safeName}`;
  await RNFS.copyFile(sourceUri, targetPath);
  const stat = await RNFS.stat(targetPath);
  return {filePath: targetPath, sizeBytes: Number(stat.size)};
}
