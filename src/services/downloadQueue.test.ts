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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {downloadModel, downloadRemoteModel, getFreeStorageBytes, DownloadCancelledError} from './downloadManager';
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
  return {handle: {cancel, completion}, resolveFn, rejectFn, cancel};
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
    (getFreeStorageBytes as jest.Mock<any>).mockReset().mockResolvedValue(1e12);
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
    );
    expect(downloadModel).not.toHaveBeenCalled();
  });
});
