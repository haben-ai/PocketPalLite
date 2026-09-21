import {describe, it, expect, beforeEach, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// downloadQueue.ts is tested as an orchestrator: its collaborators
// (the actual download mechanics, already covered by
// downloadManager.test.ts; the catalog/translation-catalog lookups; secure
// storage) are mocked so these tests exercise only ordering, single-flight,
// and cancel/retry status transitions.
jest.mock('./downloadManager', () => {
  class DownloadCancelledError extends Error {}
  return {
    downloadModel: jest.fn(),
    downloadRemoteModel: jest.fn(),
    getFreeStorageBytes: jest.fn(() => Promise.resolve(1e12)),
    hasInternetConnection: jest.fn(() => Promise.resolve(true)),
    DownloadCancelledError,
  };
});
jest.mock('./translationDownloadManager', () => ({
  downloadTranslationModel: jest.fn(),
}));
jest.mock('../data/models', () => ({
  getModelById: jest.fn((id: string) => ({id, sizeBytes: 1000})),
}));
jest.mock('../data/translationModels', () => ({
  getTranslationModelById: jest.fn((id: string) => ({
    id,
    encoderSizeBytes: 500,
    decoderSizeBytes: 500,
  })),
}));
jest.mock('./secureStorage', () => ({
  getSecret: jest.fn(() => Promise.resolve(null)),
  SECRET_SERVICE: {hfToken: 'pocketpal.hf_token'},
}));

// Overrides jest.setup.js's global NetInfo mock (which always reports
// Wi-Fi) so these tests can control connection type per-case -- a local
// jest.mock() for a module already mocked in setupFiles takes precedence
// for this file.
let mockNetInfoType = 'wifi';
let mockNetInfoListeners: Array<(state: {type: string}) => void> = [];
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({type: mockNetInfoType})),
    addEventListener: jest.fn((listener: (state: {type: string}) => void) => {
      mockNetInfoListeners.push(listener);
      return jest.fn(() => {
        mockNetInfoListeners = mockNetInfoListeners.filter(l => l !== listener);
      });
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {downloadModel, downloadRemoteModel, getFreeStorageBytes, DownloadCancelledError} from './downloadManager';
import {downloadTranslationModel} from './translationDownloadManager';
import * as downloadQueue from './downloadQueue';

/** A controllable in-flight handle: the test decides when completion
 * resolves/rejects, rather than it happening on its own. cancel() mirrors
 * the real primitive's behavior (verified in downloadManager.test.ts) --
 * it rejects completion with DownloadCancelledError. */
function deferredHandle() {
  let resolveFn!: () => void;
  let rejectFn!: (err: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  completion.catch(() => undefined);
  const cancel = jest.fn(() => {
    rejectFn(new DownloadCancelledError());
  });
  const pause = jest.fn();
  const resume = jest.fn();
  return {handle: {cancel, pause, resume, completion}, resolveFn, rejectFn, cancel, pause, resume};
}

/** processNext()'s chain (getAppSettings -> startJob -> withHfHeaders ->
 * getAppSettings/getSecret -> the mocked download call) crosses many real
 * promise hops (including the real AsyncStorage mock), so a fixed number of
 * `await Promise.resolve()` ticks is fragile. Polling with real macrotask
 * yields until the expected state actually shows up is robust regardless of
 * exactly how many microtask hops it takes. */
async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor: timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

describe('downloadQueue', () => {
  const queue = downloadQueue;

  beforeEach(async () => {
    await AsyncStorage.clear();
    queue.__resetForTests();
    (downloadModel as jest.Mock<any>).mockReset();
    (downloadRemoteModel as jest.Mock<any>).mockReset();
    (downloadTranslationModel as jest.Mock<any>).mockReset();
    (getFreeStorageBytes as jest.Mock<any>).mockReset().mockResolvedValue(1e12);
    mockNetInfoType = 'wifi';
    mockNetInfoListeners = [];
  });

  it('runs a single enqueued job and removes it (firing onDone) once it completes', async () => {
    const {handle, resolveFn} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(handle);

    const doneDescriptors: any[] = [];
    queue.onDone(d => doneDescriptors.push(d));

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');

    resolveFn();
    await waitFor(() => queue.getQueueSnapshot().length === 0);

    expect(doneDescriptors).toEqual([{kind: 'catalog', modelId: 'm1'}]);
  });

  it('is single-flight: a second enqueued job stays queued until the first finishes', async () => {
    const first = deferredHandle();
    const second = deferredHandle();
    (downloadModel as jest.Mock<any>)
      .mockResolvedValueOnce(first.handle)
      .mockResolvedValueOnce(second.handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
    await queue.enqueue({kind: 'catalog', modelId: 'm2'});

    let snapshot = queue.getQueueSnapshot();
    expect(snapshot.find(i => i.descriptor.modelId === 'm1')?.status).toBe('downloading');
    expect(snapshot.find(i => i.descriptor.modelId === 'm2')?.status).toBe('queued');
    // Wi-Fi gating (getAppSettings + NetInfo.fetch) adds a couple more
    // async hops between "claimed, status flipped to downloading" and
    // "downloadModel() actually invoked" -- wait for it rather than
    // asserting immediately, same reasoning as this file's waitFor() helper
    // doc comment.
    await waitFor(() => (downloadModel as jest.Mock<any>).mock.calls.length > 0);
    expect(downloadModel).toHaveBeenCalledTimes(1);

    first.resolveFn();
    await waitFor(
      () => queue.getQueueSnapshot().find(i => i.descriptor.modelId === 'm2')?.status === 'downloading',
    );

    expect(downloadModel).toHaveBeenCalledTimes(2);
  });

  it('regression: overlapping enqueue() calls never both claim a job (no concurrent downloads)', async () => {
    // Deliberately no `await` / waitFor between these two enqueue() calls --
    // each internally fires processNext() without awaiting it, so their
    // internal getAppSettings() awaits can genuinely interleave. Before the
    // `claiming` lock, both could pass the `activeJobId` check and both
    // claim+start a job.
    const first = deferredHandle();
    const second = deferredHandle();
    (downloadModel as jest.Mock<any>)
      .mockResolvedValueOnce(first.handle)
      .mockResolvedValueOnce(second.handle);

    await Promise.all([
      queue.enqueue({kind: 'catalog', modelId: 'm1'}),
      queue.enqueue({kind: 'catalog', modelId: 'm2'}),
    ]);
    await waitFor(() => (downloadModel as jest.Mock<any>).mock.calls.length >= 1);
    // Give any wrongly-concurrent second claim a chance to have fired too.
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(downloadModel).toHaveBeenCalledTimes(1);
    const downloading = queue.getQueueSnapshot().filter(i => i.status === 'downloading');
    expect(downloading).toHaveLength(1);
  });

  it('regression: cancelling while the job is claimed but startJob() has not resolved a handle yet is not dropped', async () => {
    const {handle, cancel} = deferredHandle();
    let resolveStartJob!: () => void;
    (downloadModel as jest.Mock<any>).mockImplementationOnce(
      () => new Promise(resolve => (resolveStartJob = () => resolve(handle))),
    );

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    // The item is claimed (status 'downloading') the instant processNext()
    // picks it, well before startJob()'s downloadModel() call resolves --
    // this is exactly that window.
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
    // Wait for downloadModel() itself to have actually been invoked (which
    // is what assigns resolveStartJob) -- the status flips to 'downloading'
    // synchronously, one await hop before downloadModel() is called.
    await waitFor(() => (downloadModel as jest.Mock<any>).mock.calls.length > 0);

    queue.cancel({kind: 'catalog', modelId: 'm1'});
    // At this point activeHandle is still null (downloadModel hasn't
    // resolved), so a naive activeHandle?.cancel() would have silently
    // done nothing. Now let downloadModel() resolve.
    resolveStartJob();

    await waitFor(() => cancel.mock.calls.length > 0);
    await waitFor(() => queue.getQueueSnapshot().length === 0);
  });

  it('cancel removes a not-yet-started queued job entirely', async () => {
    const first = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValueOnce(first.handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
    await queue.enqueue({kind: 'catalog', modelId: 'm2'});

    queue.cancel({kind: 'catalog', modelId: 'm2'});

    const snapshot = queue.getQueueSnapshot();
    expect(snapshot.find(i => i.descriptor.modelId === 'm2')).toBeUndefined();
    expect(snapshot.find(i => i.descriptor.modelId === 'm1')?.status).toBe('downloading');
  });

  it('a real download failure marks the item failed with its error message; retry re-queues it', async () => {
    const {handle, rejectFn} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValueOnce(handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');

    rejectFn(new Error('disk full'));
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'failed');

    expect(queue.getQueueSnapshot()[0].error).toBe('disk full');

    const retryHandle = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValueOnce(retryHandle.handle);
    queue.retry({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');

    expect(queue.getQueueSnapshot()[0].error).toBeUndefined();
  });

  it('rejects enqueue up front when free storage is insufficient, without adding the item', async () => {
    (getFreeStorageBytes as jest.Mock<any>).mockResolvedValueOnce(10);

    await expect(queue.enqueue({kind: 'catalog', modelId: 'm1'})).rejects.toThrow(
      /Not enough free storage/,
    );
    expect(queue.getQueueSnapshot()).toHaveLength(0);
  });

  it('enqueuing the same job twice is a no-op', async () => {
    const {handle} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
    await queue.enqueue({kind: 'catalog', modelId: 'm1'});

    expect(queue.getQueueSnapshot()).toHaveLength(1);
  });

  it('routes a "remote" descriptor through downloadRemoteModel, not downloadModel', async () => {
    const {handle} = deferredHandle();
    (downloadRemoteModel as jest.Mock<any>).mockResolvedValue(handle);

    await queue.enqueue({
      kind: 'remote',
      modelId: 'remote-1',
      url: 'https://example.com/x.gguf',
      displayName: 'X',
      sizeBytes: 1000,
    });
    await waitFor(() => (downloadRemoteModel as jest.Mock<any>).mock.calls.length > 0);

    expect(downloadRemoteModel).toHaveBeenCalledWith(
      'remote-1',
      'https://example.com/x.gguf',
      'X',
      expect.any(Function),
      undefined,
      'remote:remote-1',
    );
    expect(downloadModel).not.toHaveBeenCalled();
  });

  it('pause() stops the active job and marks it paused; resume() continues the same handle', async () => {
    const {handle, pause, resume} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    // Status flips to 'downloading' the instant processNext() claims the
    // item, before the Wi-Fi-gating hop (getAppSettings + NetInfo.fetch)
    // even runs -- pause() only takes effect once activeHandle is actually
    // populated, which happens after downloadModel() itself resolves, so
    // wait for that specifically rather than the status flip alone.
    await waitFor(() => (downloadModel as jest.Mock<any>).mock.calls.length > 0);
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');

    queue.pause({kind: 'catalog', modelId: 'm1'});
    expect(pause).toHaveBeenCalledTimes(1);
    expect(queue.getQueueSnapshot()[0]?.status).toBe('paused');

    queue.resume({kind: 'catalog', modelId: 'm1'});
    expect(resume).toHaveBeenCalledTimes(1);
    expect(queue.getQueueSnapshot()[0]?.status).toBe('downloading');

    // Never re-called downloadModel -- resuming reused the same in-memory
    // handle rather than starting a whole new download.
    expect(downloadModel).toHaveBeenCalledTimes(1);
  });

  it('pause() is a no-op for a job kind with no pause capability (translation)', async () => {
    const completion = new Promise<void>(() => undefined);
    (downloadTranslationModel as jest.Mock<any>).mockResolvedValue({
      cancel: jest.fn(),
      completion,
    });

    await queue.enqueue({kind: 'translation', modelId: 't1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');

    queue.pause({kind: 'translation', modelId: 't1'});
    expect(queue.getQueueSnapshot()[0]?.status).toBe('downloading');
  });

  it('wifiOnlyDownloads gates a non-Wi-Fi connection to waiting-for-wifi, then auto-starts once Wi-Fi returns', async () => {
    mockNetInfoType = 'cellular';
    const {handle} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'waiting-for-wifi');

    expect(downloadModel).not.toHaveBeenCalled();

    mockNetInfoType = 'wifi';
    mockNetInfoListeners.forEach(l => l({type: 'wifi'}));

    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
    expect(downloadModel).toHaveBeenCalledTimes(1);
  });

  it('cancelling a job that is waiting-for-wifi unblocks the queue instead of leaving it stuck', async () => {
    mockNetInfoType = 'cellular';
    const {handle} = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(handle);

    await queue.enqueue({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'waiting-for-wifi');

    queue.cancel({kind: 'catalog', modelId: 'm1'});
    await waitFor(() => queue.getQueueSnapshot().length === 0);

    // A second job enqueued afterward must still be able to start -- proof
    // the queue actually freed up rather than staying wedged on the
    // cancelled Wi-Fi wait.
    const second = deferredHandle();
    (downloadModel as jest.Mock<any>).mockResolvedValue(second.handle);
    mockNetInfoType = 'wifi';
    await queue.enqueue({kind: 'catalog', modelId: 'm2'});
    await waitFor(() => queue.getQueueSnapshot()[0]?.status === 'downloading');
  });
});
