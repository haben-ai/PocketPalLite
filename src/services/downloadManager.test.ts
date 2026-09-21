import {describe, it, expect, beforeEach, jest} from '@jest/globals';

// Fine-grained per-test control over the native download layer -- distinct
// from jest.setup.js's global stub (which just needs modules to load
// without crashing) since these tests need to assert on exactly what
// downloadToFile asks RNFS to do (which files get hashed/unlinked/moved,
// retry counts, cancellation). Jest's jest.mock() factory can only close
// over variables named mock* (case-insensitive) -- see
// https://jestjs.io/docs/es6-class-mocks#calling-jestmock-with-the-module-factory-parameter.
let mockNextDownloadResults: Array<{statusCode?: number; error?: Error}> = [];
let mockHashResult = '';
const mockDownloadCalls: Array<{fromUrl: string; toFile: string; headers?: Record<string, string>}> = [];
const mockStopDownloadCalls: number[] = [];
const mockUnlinkCalls: string[] = [];
const mockMoveFileCalls: Array<{from: string; to: string}> = [];
let mockNextJobId = 1;

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  getFSInfo: jest.fn(() => Promise.resolve({freeSpace: 1e12, totalSpace: 1e12})),
  downloadFile: jest.fn(({fromUrl, toFile, headers}: {fromUrl: string; toFile: string; headers?: Record<string, string>}) => {
    mockDownloadCalls.push({fromUrl, toFile, headers});
    const next = mockNextDownloadResults.shift() ?? {statusCode: 200};
    const jobId = mockNextJobId++;
    const promise = next.error
      ? Promise.reject(next.error)
      : Promise.resolve({statusCode: next.statusCode ?? 200});
    return {jobId, promise};
  }),
  stopDownload: jest.fn((jobId: number) => {
    mockStopDownloadCalls.push(jobId);
  }),
  unlink: jest.fn((path: string) => {
    mockUnlinkCalls.push(path);
    return Promise.resolve();
  }),
  moveFile: jest.fn((from: string, to: string) => {
    mockMoveFileCalls.push({from, to});
    return Promise.resolve();
  }),
  copyFile: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({size: 0})),
  readFile: jest.fn(() => Promise.resolve('')),
  readDir: jest.fn(() => Promise.resolve([])),
  hash: jest.fn(() => Promise.resolve(mockHashResult)),
}));

import {downloadToFile, DownloadCancelledError, ChecksumMismatchError} from './downloadManager';

describe('downloadToFile', () => {
  beforeEach(() => {
    mockNextDownloadResults = [];
    mockHashResult = '';
    mockDownloadCalls.length = 0;
    mockStopDownloadCalls.length = 0;
    mockUnlinkCalls.length = 0;
    mockMoveFileCalls.length = 0;
    mockNextJobId = 1;
  });

  it('downloads fresh and moves the .part file to the final path', async () => {
    mockNextDownloadResults = [{statusCode: 200}];
    mockHashResult = 'abc123';

    const handle = downloadToFile(
      'https://example.com/model.gguf',
      '/mock/documents/models/model.gguf',
      () => undefined,
      undefined,
      'abc123',
    );
    await handle.completion;

    expect(mockDownloadCalls).toHaveLength(1);
    expect(
      mockMoveFileCalls.some(
        m => m.from === '/mock/documents/models/model.gguf.part' && m.to === '/mock/documents/models/model.gguf',
      ),
    ).toBe(true);
  });

  it('rejects and deletes .part when the SHA-256 does not match, without moving it to the final path', async () => {
    mockNextDownloadResults = [{statusCode: 200}];
    mockHashResult = 'wrong-hash';

    const handle = downloadToFile(
      'https://example.com/model.gguf',
      '/mock/documents/models/model.gguf',
      () => undefined,
      undefined,
      'expected-hash',
    );

    await expect(handle.completion).rejects.toBeInstanceOf(ChecksumMismatchError);
    expect(mockMoveFileCalls.some(m => m.to === '/mock/documents/models/model.gguf')).toBe(false);
    expect(mockUnlinkCalls).toContain('/mock/documents/models/model.gguf.part');
  });

  it('skips checksum verification entirely when no sha256 is given (e.g. an arbitrary remote URL)', async () => {
    mockNextDownloadResults = [{statusCode: 200}];
    mockHashResult = 'irrelevant';

    const handle = downloadToFile(
      'https://example.com/model.gguf',
      '/mock/documents/models/model.gguf',
      () => undefined,
    );
    await handle.completion;

    expect(mockMoveFileCalls.some(m => m.to === '/mock/documents/models/model.gguf')).toBe(true);
  });

  it('retries a transient failure and succeeds on a later attempt, restarting from byte 0', async () => {
    jest.useFakeTimers();
    try {
      mockNextDownloadResults = [
        {error: new Error('network blip')},
        {statusCode: 200},
      ];
      mockHashResult = 'abc123';

      const handle = downloadToFile(
        'https://example.com/model.gguf',
        '/mock/documents/models/model.gguf',
        () => undefined,
        undefined,
        'abc123',
      );
      // Let the first attempt's rejection propagate, then fast-forward past
      // the retry backoff delay so the second (successful) attempt runs.
      await jest.advanceTimersByTimeAsync(20000);

      await handle.completion;
      expect(mockDownloadCalls).toHaveLength(2);
      expect(mockMoveFileCalls.some(m => m.to === '/mock/documents/models/model.gguf')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives up with the original error after exhausting all retries', async () => {
    jest.useFakeTimers();
    try {
      const err = new Error('persistent network failure');
      mockNextDownloadResults = [{error: err}, {error: err}, {error: err}];

      const handle = downloadToFile(
        'https://example.com/model.gguf',
        '/mock/documents/models/model.gguf',
        () => undefined,
      );
      const assertion = expect(handle.completion).rejects.toBe(err);
      await jest.advanceTimersByTimeAsync(60000);
      await assertion;
      // 1 initial attempt + 2 retries = 3 total.
      expect(mockDownloadCalls).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancelling stops the native job and rejects with DownloadCancelledError', async () => {
    mockNextDownloadResults = [{error: new Error('never resolves in time')}];

    const handle = downloadToFile(
      'https://example.com/model.gguf',
      '/mock/documents/models/model.gguf',
      () => undefined,
      undefined,
      'abc123',
    );
    handle.cancel();

    await expect(handle.completion).rejects.toBeInstanceOf(DownloadCancelledError);
  });
});
