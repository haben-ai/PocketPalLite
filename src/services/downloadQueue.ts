import NetInfo from '@react-native-community/netinfo';
import {getJSON, setJSON, KEYS} from '../storage/asyncStore';
import {getAppSettings} from '../storage/appSettings';
import {getModelById} from '../data/models';
import {getTranslationModelById} from '../data/translationModels';
import {getSecret, SECRET_SERVICE} from './secureStorage';
import {
  downloadModel,
  downloadRemoteModel,
  getFreeStorageBytes,
  hasInternetConnection,
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

export type QueueItemStatus = 'queued' | 'downloading' | 'paused' | 'waiting-for-wifi' | 'failed';

export type QueueItem = {
  descriptor: QueueJobDescriptor;
  status: QueueItemStatus;
  fraction: number;
  /** Real bytes transferred so far (from RNFS's own progress callback, not
   * derived from fraction*totalBytes -- stays accurate even before
   * totalBytes is known for a not-yet-resolved remote URL). */
  bytesWritten: number;
  /** Resolved once at enqueue time (resolveSizeBytes) so the UI can show
   * "X MB / Y MB" from the very first progress tick, not just once transfer
   * starts. 0 when genuinely unknown (a remote URL without a declared
   * Content-Length). */
  totalBytes: number;
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
let activeHandle: {cancel: () => void; pause?: () => void; resume?: () => void} | null = null;
/** Set by waitForWifi() while a job is parked at 'waiting-for-wifi', so
 * cancel() can unblock processNext()'s await on it -- otherwise cancelling
 * a job stuck waiting for Wi-Fi would never actually free up the queue,
 * since there's no real handle yet for cancel() to call into. */
let wifiWaitCancel: (() => void) | null = null;
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
  wifiWaitCancel = null;
  claiming = false;
  cancelPendingForActiveJob = false;
  listeners.clear();
  doneListeners.clear();
}

function persist(): void {
  setJSON(KEYS.downloadQueue, items).catch(() => undefined);
  lastPersistAt = Date.now();
}

// Progress ticks arrive far more often (every ~2% via RNFS's
// progressDivider) than the on-disk queue snapshot actually needs updating
// -- persisting on every tick meant serializing and writing the whole queue
// array to AsyncStorage ~50 times over one download, real, avoidable I/O
// and JS-thread work that had nothing to do with the transfer itself.
// notify() still updates listeners (cheap: a React state set) on every
// tick for a smooth-reading UI; persistence is throttled to this interval,
// with notifyAndPersist() used for status transitions (queued/downloading/
// failed/removed) that must survive a kill immediately rather than up to an
// interval late.
const PERSIST_INTERVAL_MS = 1000;
let lastPersistAt = 0;

function notify(): void {
  const snapshot = items;
  listeners.forEach(l => l(snapshot));
  if (Date.now() - lastPersistAt >= PERSIST_INTERVAL_MS) {
    persist();
  }
}

function notifyAndPersist(): void {
  listeners.forEach(l => l(items));
  persist();
}

/**
 * Single-flight (concurrency 1) FIFO download queue sitting above
 * downloadManager.ts's per-file primitive -- shared by catalog models,
 * "Add Remote Model"/Hugging Face downloads, and translation models, so
 * only one large download ever runs at a time regardless of source.
 * Queue state + per-item progress persist to AsyncStorage on every change;
 * ensureLoaded() rehydrates it on first use each app session.
 *
 * 'downloading'/'waiting-for-wifi' from a session that ended without
 * finishing (the process was killed) become 'queued' again -- not because
 * the transfer itself is lost (catalog/remote jobs run through
 * downloadModel()/downloadRemoteModel(), which reconnect to any
 * still-alive native background-downloader task for the same job id
 * instead of restarting from 0; only translation jobs, still on the
 * RNFS-based primitive with no real resume, actually restart), but because
 * this session has no live in-memory handle for it yet -- re-queuing is
 * what gets processNext() to call startJob() again and either reconnect or
 * (translation only) genuinely restart.
 *
 * 'paused' is left as-is: a user-paused download should stay paused across
 * a relaunch rather than silently resuming itself. resume() below handles
 * reconnecting to it when the user taps Resume again.
 */
async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const stored = await getJSON<QueueItem[]>(KEYS.downloadQueue, []);
      // bytesWritten/totalBytes default to 0 for a queue item persisted by
      // an older build that predates those fields -- the UI falls back to
      // percentage-only display until the next progress tick fills them in
      // for real, rather than showing NaN/undefined.
      items = stored.map(i => ({
        ...i,
        status:
          i.status === 'downloading' || i.status === 'waiting-for-wifi' ? ('queued' as const) : i.status,
        bytesWritten: i.bytesWritten ?? 0,
        totalBytes: i.totalBytes ?? 0,
      }));
      loaded = true;
      notify();
      processNext();
    })();
  }
  await loadPromise;
}

/**
 * Called once from App.tsx's boot sequence, not just left to happen
 * whenever the Models screen first mounts -- reconnecting to any live
 * background-downloader task (getExistingDownloadTasks(), inside
 * downloadModel()/downloadRemoteModel()) needs to happen as early as
 * possible after a cold start. The library's own docs warn that iOS
 * throttles an app's future background transfer time if a finished
 * session's completeHandler() isn't called promptly -- waiting for the
 * user to happen to open Models first would leave that unacknowledged for
 * however long that takes.
 */
export async function initDownloadQueue(): Promise<void> {
  await ensureLoaded();
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
 * same job is already queued/active. Storage and connectivity are both
 * checked here, up front -- before the item ever becomes 'downloading' --
 * so an obviously-too-large download or a dead connection is rejected
 * immediately (a clear, actionable error) rather than only surfacing once
 * it reaches the front of the queue and fails deep inside a transfer.
 */
export async function enqueue(descriptor: QueueJobDescriptor): Promise<void> {
  await ensureLoaded();
  const id = jobId(descriptor);
  if (items.some(i => jobId(i.descriptor) === id)) {
    return;
  }
  if (!(await hasInternetConnection())) {
    throw new Error('No internet connection. Check your Wi-Fi or mobile data and try again.');
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
  items = [
    ...items,
    {descriptor, status: 'queued', fraction: 0, bytesWritten: 0, totalBytes: sizeBytes, addedAt: Date.now()},
  ];
  notifyAndPersist();
  processNext();
}

/** Abandons a job entirely -- deletes its .part file (via the primitive's
 * own cancel cleanup) and removes it from the queue. */
export function cancel(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  if (activeJobId === id) {
    if (activeHandle) {
      activeHandle.cancel();
    } else if (wifiWaitCancel) {
      // Parked at 'waiting-for-wifi' -- no real handle exists yet (nothing
      // has actually started transferring), so unblock processNext()'s
      // await on Wi-Fi instead of leaving it stuck waiting forever.
      wifiWaitCancel();
    } else {
      // Claimed (status already 'downloading') but startJob() hasn't
      // resolved a real handle yet -- apply it the instant one exists
      // instead of silently dropping this cancel.
      cancelPendingForActiveJob = true;
    }
  }
  items = items.filter(i => jobId(i.descriptor) !== id);
  notifyAndPersist();
}

/** Pauses the actively-downloading job, if it has pause capability
 * (translation-model jobs, still on the RNFS primitive, don't). A no-op
 * for anything not currently active -- a queued item has nothing running
 * to pause. */
export function pause(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  if (activeJobId !== id || !activeHandle?.pause) {
    return;
  }
  activeHandle.pause();
  items = items.map(i => (jobId(i.descriptor) === id ? {...i, status: 'paused' as const} : i));
  notifyAndPersist();
}

/** Resumes a paused job. A 'paused' item is, by construction, always the
 * job that was active when it was paused (pause() only ever applies to the
 * active job) -- so if this session still has its live handle in memory,
 * resuming is just calling .resume() on it directly. Otherwise (a cold
 * relaunch since it was paused) there's nothing live to resume in this
 * session yet; re-queuing it lets processNext() call startJob() again,
 * which reconnects to the still-alive native task for this job id and
 * resumes it itself (see downloadManager.ts's runEngineDownload). */
export function resume(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  const item = items.find(i => jobId(i.descriptor) === id);
  if (!item || item.status !== 'paused') {
    return;
  }
  if (activeJobId === id && activeHandle?.resume) {
    activeHandle.resume();
    items = items.map(i => (jobId(i.descriptor) === id ? {...i, status: 'downloading' as const} : i));
    notifyAndPersist();
    return;
  }
  items = items.map(i => (jobId(i.descriptor) === id ? {...i, status: 'queued' as const} : i));
  notifyAndPersist();
  processNext();
}

/** Re-queues a failed job so it starts over from byte 0. */
export function retry(descriptor: QueueJobDescriptor): void {
  const id = jobId(descriptor);
  items = items.map(i =>
    jobId(i.descriptor) === id && i.status === 'failed'
      ? {...i, status: 'queued' as const, error: undefined, fraction: 0, bytesWritten: 0}
      : i,
  );
  notifyAndPersist();
  processNext();
}

async function withHfHeaders(): Promise<Record<string, string> | undefined> {
  const {useHfToken} = await getAppSettings();
  const hfToken = useHfToken ? await getSecret(SECRET_SERVICE.hfToken) : null;
  return hfToken ? {Authorization: `Bearer ${hfToken}`} : undefined;
}

async function startJob(
  descriptor: QueueJobDescriptor,
  onProgress: (fraction: number, bytesWritten: number) => void,
  totalBytes: number,
): Promise<{cancel: () => void; pause?: () => void; resume?: () => void; completion: Promise<void>}> {
  if (descriptor.kind === 'catalog') {
    const model = getModelById(descriptor.modelId);
    if (!model) {
      throw new Error('Unknown model');
    }
    const headers = await withHfHeaders();
    return downloadModel(model, onProgress, headers, jobId(descriptor));
  }
  if (descriptor.kind === 'remote') {
    const headers = await withHfHeaders();
    return downloadRemoteModel(
      descriptor.modelId,
      descriptor.url,
      descriptor.displayName,
      onProgress,
      headers,
      jobId(descriptor),
    );
  }
  const translationModel = getTranslationModelById(descriptor.modelId);
  if (!translationModel) {
    throw new Error('Unknown translation model');
  }
  // downloadTranslationModel only reports an aggregated fraction, not real
  // bytes (it sums across encoder+decoder internally) -- totalBytes is
  // already known upfront here (resolveSizeBytes, at enqueue time), so
  // deriving bytesWritten from it is a reasonable approximation rather than
  // leaving it at 0 throughout, honest about being derived, not measured.
  return downloadTranslationModel(translationModel, fraction =>
    onProgress(fraction, Math.round(fraction * totalBytes)),
  );
}

/** Resolves once NetInfo reports a Wi-Fi connection. wifiWaitCancel (module
 * state) lets cancel() resolve this early if the waiting job gets
 * cancelled, instead of leaving processNext() blocked forever. */
function waitForWifi(): Promise<void> {
  return new Promise<void>(resolve => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe?.();
      wifiWaitCancel = null;
      resolve();
    };
    const subscription = NetInfo.addEventListener(state => {
      if (state.type === 'wifi') {
        finish();
      }
    });
    unsubscribe = () => subscription();
    wifiWaitCancel = finish;
  });
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
    notifyAndPersist();
    claimed = next;
  } finally {
    claiming = false;
  }

  if (!claimed) {
    return;
  }
  const id = activeJobId;

  try {
    // Re-checked here (not just at enqueue time) because this item may
    // have sat queued behind another download for a while -- connectivity
    // present when it was enqueued doesn't guarantee it's still there now
    // that it's actually about to start transferring.
    if (!(await hasInternetConnection())) {
      throw new Error('No internet connection. Check your Wi-Fi or mobile data and try again.');
    }

    // Wi-Fi gating: translation jobs are excluded -- they're much smaller
    // (a few hundred MB) and this setting is specifically about the large
    // LLM model downloads. Parks the item at 'waiting-for-wifi' rather than
    // erroring, and blocks the queue on it (matching single-flight) until
    // Wi-Fi shows up or the setting itself changes.
    if (claimed.descriptor.kind !== 'translation') {
      const {wifiOnlyDownloads} = await getAppSettings();
      if (wifiOnlyDownloads && (await NetInfo.fetch()).type !== 'wifi') {
        items = items.map(i => (jobId(i.descriptor) === id ? {...i, status: 'waiting-for-wifi' as const} : i));
        notifyAndPersist();
        await waitForWifi();
        // The waiting job may have been cancelled while we waited (that's
        // what wifiWaitCancel resolving early, rather than real Wi-Fi,
        // means) -- if so, activeJobId no longer matches (cancel() doesn't
        // clear it directly, but there's nothing left in `items` for this
        // id), so just fall through to the finally block instead of
        // starting a job for an item that no longer exists.
        if (!items.some(i => jobId(i.descriptor) === id)) {
          return;
        }
        items = items.map(i => (jobId(i.descriptor) === id ? {...i, status: 'downloading' as const} : i));
        notifyAndPersist();
      }
    }

    const handle = await startJob(
      claimed.descriptor,
      (fraction, bytesWritten) => {
        items = items.map(i => (jobId(i.descriptor) === id ? {...i, fraction, bytesWritten} : i));
        notify();
      },
      claimed.totalBytes,
    );
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
    notifyAndPersist();
    processNext();
  }
}
