import {getJSON, setJSON, KEYS} from '../storage/asyncStore';
import {getAppSettings} from '../storage/appSettings';
import {getModelById} from '../data/models';
import {getTranslationModelById} from '../data/translationModels';
import {getSecret, SECRET_SERVICE} from './secureStorage';
import {
  downloadModel,
  downloadRemoteModel,
  getFreeStorageBytes,
  DownloadCancelledError,
} from './downloadManager';
import {downloadTranslationModel} from './translationDownloadManager';

/**
 * Describes *what* to download, not the in-flight handle for doing so --
 * this is what gets persisted, so it has to be plain, JSON-serializable
 * data that's enough to reconstruct the actual download call (via
 * startJob() below) both on first enqueue and after an app relaunch.
 */
export type QueueJobDescriptor =
  | {kind: 'catalog'; modelId: string}
  | {kind: 'remote'; modelId: string; url: string; displayName: string; sizeBytes: number}
  | {kind: 'translation'; modelId: string};

export type QueueItemStatus = 'queued' | 'downloading' | 'failed';

export type QueueItem = {
  descriptor: QueueJobDescriptor;
  status: QueueItemStatus;
  fraction: number;
  error?: string;
  addedAt: number;
};

function jobId(descriptor: QueueJobDescriptor): string {
  return `${descriptor.kind}:${descriptor.modelId}`;
}

type Listener = (items: QueueItem[]) => void;
type DoneListener = (descriptor: QueueJobDescriptor) => void;

let items: QueueItem[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
let activeJobId: string | null = null;
let activeHandle: {cancel: () => void} | null = null;
/** Set synchronously (no await before it) the instant processNext() decides
 * to claim the front-of-queue item, cleared synchronously once that claim
 * finishes. processNext() can be re-entered while an earlier call is still
 * awaiting getAppSettings() before it's claimed anything (enqueue()/retry()
 * call it without awaiting it, and the queue's own finally block calls it
 * again right after a job ends) -- without this flag, two overlapping
 * calls could both pass the `activeJobId` check and both claim (and
 * start) a job, breaking the single-flight guarantee. */
let claiming = false;
/** A cancel requested for the job processNext() has already claimed
 * (activeJobId is set) but whose real handle doesn't exist yet (startJob()
 * is still awaiting downloadModel()'s own setup work). Applied the instant
 * the handle becomes available, so a cancel tapped in that window isn't
 * silently dropped. */
let cancelPendingForActiveJob = false;
const listeners = new Set<Listener>();
const doneListeners = new Set<DoneListener>();

/** Fires once, right when a job finishes successfully -- unlike onChange
 * (which reflects the queue's ongoing display state), this is the signal
 * for one-shot side effects like refreshing the downloaded-models list or
 * auto-navigating to chat, since a completed item is removed from the
 * queue immediately after (there's nothing left to show progress for). */
export function onDone(listener: DoneListener): () => void {
  doneListeners.add(listener);
  return () => {
    doneListeners.delete(listener);
  };
}

/** Test-only: resets this module's in-memory state between test cases,
 * since it's a singleton (module-level state) in production by design.
 * Never called from app code. */
export function __resetForTests(): void {
  items = [];
  loaded = false;
  loadPromise = null;
  activeJobId = null;
  activeHandle = null;
  claiming = false;
  cancelPendingForActiveJob = false;
  listeners.clear();
  doneListeners.clear();
}

function persist(): void {
  setJSON(KEYS.downloadQueue, items).catch(() => undefined);
}

function notify(): void {
  const snapshot = items;
  listeners.forEach(l => l(snapshot));
  persist();
}

/**
 * Single-flight (concurrency 1) FIFO download queue sitting above
 * downloadManager.ts's per-file primitive -- shared by catalog models,
 * "Add Remote Model"/Hugging Face downloads, and translation models, so
 * only one large download ever runs at a time regardless of source.
 * Queue state + per-item progress persist to AsyncStorage on every change;
 * ensureLoaded() rehydrates it on first use each app session. Anything
 * still marked 'downloading' from a session that ended without finishing
 * (the process was killed) gets requeued rather than left stuck -- it
 * restarts from byte 0 (downloadManager.ts's primitive has no
 * Range-resume), matching how a retry after a real failure also restarts.
 */
async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const stored = await getJSON<QueueItem[]>(KEYS.downloadQueue, []);
      items = stored.map(i => (i.status === 'downloading' ? {...i, status: 'queued' as const} : i));
      loaded = true;
      notify();
      processNext();
    })();
  }
  await loadPromise;
}

export function onChange(listener: Listener): () => void {
  listeners.add(listener);
  ensureLoaded();
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export function getQueueSnapshot(): QueueItem[] {
  return items;
}

async function resolveSizeBytes(descriptor: QueueJobDescriptor): Promise<number> {
  if (descriptor.kind === 'catalog') {
    const model = getModelById(descriptor.modelId);
    return (model?.sizeBytes ?? 0) + (model?.mmprojSizeBytes ?? 0);
  }
  if (descriptor.kind === 'remote') {
    return descriptor.sizeBytes;
  }
  const model = getTranslationModelById(descriptor.modelId);
  return (model?.encoderSizeBytes ?? 0) + (model?.decoderSizeBytes ?? 0);
}

/**
 * Adds a job to the back of the queue and kicks the runner. A no-op if the
 * same job is already queued/active. Storage is checked here, up front --
 * before the item ever becomes 'downloading' -- so an obviously-too-large
 * download is rejected immediately rather than only once it reaches the
 * front of the queue.
 */
export async function enqueue(descriptor: QueueJobDescriptor): Promise<void> {
  await ensureLoaded();
  const id = jobId(descriptor);
  if (items.some(i => jobId(i.descriptor) === id)) {
    return;
  }
  const sizeBytes = await resolveSizeBytes(descriptor);
  const freeBytes = await getFreeStorageBytes();
  if (sizeBytes > 0 && freeBytes < sizeBytes * 1.05) {
    throw new Error(
      `Not enough free storage. Need ~${(sizeBytes / 1e9).toFixed(1)} GB, only ${(
        freeBytes / 1e9
      ).toFixed(1)} GB free.`,
    );
  }
  items = [...items, {descriptor, status: 'queued', fraction: 0, addedAt: Date.now()}];
  notify();
  processNext();
}

/** Abandons a job entirely -- deletes its .part file (via the primitive's
 * own cancel cleanup) and removes it from the queue. */
export function cancel(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  if (activeJobId === id) {
    if (activeHandle) {
      activeHandle.cancel();
    } else {
      // Claimed (status already 'downloading') but startJob() hasn't
      // resolved a real handle yet -- apply it the instant one exists
      // instead of silently dropping this cancel.
      cancelPendingForActiveJob = true;
    }
  }
  items = items.filter(i => jobId(i.descriptor) !== id);
  notify();
}

/** Re-queues a failed job so it starts over from byte 0. */
export function retry(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  items = items.map(i =>
    jobId(i.descriptor) === id && i.status === 'failed'
      ? {...i, status: 'queued' as const, error: undefined}
      : i,
  );
  notify();
  processNext();
}

async function withHfHeaders(): Promise<Record<string, string> | undefined> {
  const {useHfToken} = await getAppSettings();
  const hfToken = useHfToken ? await getSecret(SECRET_SERVICE.hfToken) : null;
  return hfToken ? {Authorization: `Bearer ${hfToken}`} : undefined;
}

async function startJob(
  descriptor: QueueJobDescriptor,
  onProgress: (fraction: number) => void,
): Promise<{cancel: () => void; completion: Promise<void>}> {
  if (descriptor.kind === 'catalog') {
    const model = getModelById(descriptor.modelId);
    if (!model) {
      throw new Error('Unknown model');
    }
    const headers = await withHfHeaders();
    return downloadModel(model, fraction => onProgress(fraction), headers);
  }
  if (descriptor.kind === 'remote') {
    const headers = await withHfHeaders();
    return downloadRemoteModel(
      descriptor.modelId,
      descriptor.url,
      descriptor.displayName,
      fraction => onProgress(fraction),
      headers,
    );
  }
  const translationModel = getTranslationModelById(descriptor.modelId);
  if (!translationModel) {
    throw new Error('Unknown translation model');
  }
  return downloadTranslationModel(translationModel, onProgress);
}

/**
 * Runs the front-of-queue item if nothing is already active.
 *
 * Callers (enqueue/retry, and this function's own finally block) call this
 * without awaiting it, so it can genuinely be re-entered while an earlier
 * call is still awaiting getAppSettings() before it's claimed anything --
 * the `claiming` flag (set synchronously, before any await) makes the
 * "pick the next item and mark it downloading" step atomic against that,
 * so two overlapping calls can't both claim a job and break single-flight.
 */
async function processNext(): Promise<void> {
  if (activeJobId || claiming) {
    return;
  }
  claiming = true;
  let claimed: QueueItem | null = null;
  try {
    const next = items.find(i => i.status === 'queued');
    if (!next) {
      return;
    }
    activeJobId = jobId(next.descriptor);
    items = items.map(i => (i === next ? {...i, status: 'downloading' as const} : i));
    notify();
    claimed = next;
  } finally {
    claiming = false;
  }

  if (!claimed) {
    return;
  }
  const id = activeJobId;

  try {
    const handle = await startJob(claimed.descriptor, fraction => {
      items = items.map(i => (jobId(i.descriptor) === id ? {...i, fraction} : i));
      notify();
    });
    activeHandle = handle;
    if (cancelPendingForActiveJob) {
      cancelPendingForActiveJob = false;
      handle.cancel();
    }
    await handle.completion;
    // Remove immediately rather than lingering as status: 'done' -- once
    // the download is registered as a usable model, there's nothing left
    // for a queue-progress card to show; onDone() is the signal for
    // one-shot follow-up (refresh the list, auto-navigate to chat).
    items = items.filter(i => jobId(i.descriptor) !== id);
    doneListeners.forEach(l => l(claimed!.descriptor));
  } catch (err) {
    if (err instanceof DownloadCancelledError) {
      items = items.filter(i => jobId(i.descriptor) !== id);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      items = items.map(i =>
        jobId(i.descriptor) === id ? {...i, status: 'failed' as const, error: message} : i,
      );
    }
  } finally {
    activeJobId = null;
    activeHandle = null;
    cancelPendingForActiveJob = false;
    notify();
    processNext();
  }
}
