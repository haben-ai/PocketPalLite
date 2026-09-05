// Global Jest setup. AsyncStorage's real native module isn't available under
// Jest (no device/emulator), so any test that transitively imports it
// (including __tests__/App.test.tsx, via App.tsx -> src/storage/asyncStore.ts)
// needs this mock, not just tests that use AsyncStorage directly.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-gesture-handler's own recommended Jest setup -- mocks its
// native module, needed transitively by App.tsx -> RootNavigator.
require('react-native-gesture-handler/jestSetup');

// @react-native-documents/picker's native module isn't available under
// Jest either (pre-existing gap -- ModelLibraryScreen, which imports it
// unconditionally, was already unreachable from App.test.tsx before this
// mock existed). Only `pick`/`isErrorWithCode`/`errorCodes` are actually
// used anywhere in this codebase (ChatScreen.tsx, ModelLibraryScreen.tsx).
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  isErrorWithCode: jest.fn(() => false),
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
}));

// react-native-fs's native module (and the NativeEventEmitter it
// constructs at import time) isn't available under Jest either -- same
// pre-existing gap as the document picker above, hit via
// downloadManager.ts/chatImages.ts/translationEngine.ts. Stub covers every
// RNFS.* call site actually used in this codebase.
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  getFSInfo: jest.fn(() => Promise.resolve({freeSpace: 1e12, totalSpace: 1e12})),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({statusCode: 200}),
  })),
  stopDownload: jest.fn(),
  unlink: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({size: 0})),
  readFile: jest.fn(() => Promise.resolve('')),
}));

// react-native-device-info's native module isn't available under Jest
// either -- same pre-existing gap, hit via deviceAnalyzer.ts. Also covers
// the sync getters BenchmarkScreen/AppInfoScreen call (getBrand, getModel,
// etc.) so those screens don't crash if a future test renders them.
jest.mock('react-native-device-info', () => ({
  getTotalMemory: jest.fn(() => Promise.resolve(8 * 1024 ** 3)),
  getFreeDiskStorage: jest.fn(() => Promise.resolve(10 * 1024 ** 3)),
  getUsedMemory: jest.fn(() => Promise.resolve(1 * 1024 ** 3)),
  getUsedMemorySync: jest.fn(() => 1 * 1024 ** 3),
  getBrand: jest.fn(() => 'TestBrand'),
  getModel: jest.fn(() => 'TestModel'),
  getSystemVersion: jest.fn(() => '13'),
  getApplicationName: jest.fn(() => 'PocketPalLite'),
  getBundleId: jest.fn(() => 'com.pocketpallite'),
  getBuildNumber: jest.fn(() => '1'),
  getVersion: jest.fn(() => '0.0.1'),
}));

// @dariyd/react-native-pdf-page-image's TurboModule isn't available under
// Jest either -- same pre-existing gap, hit via ChatScreen.tsx.
jest.mock('@dariyd/react-native-pdf-page-image/index', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    generate: jest.fn(() => Promise.resolve({uri: '/mock/page.jpg'})),
    generateAllPages: jest.fn(),
    close: jest.fn(() => Promise.resolve()),
  },
}));

// @react-native-clipboard/clipboard's native module isn't available under
// Jest either -- hit via ChatBubble.tsx.
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

// @pocketpalai/llama.rn's native module isn't available under Jest either
// -- same pre-existing gap, hit via llamaSession.ts. Only initLlama is
// actually called anywhere in this codebase.
jest.mock('@pocketpalai/llama.rn', () => ({
  initLlama: jest.fn(),
}));

// onnxruntime-react-native's native binding isn't available under Jest
// either -- same pre-existing gap, hit via translationEngine.ts (imported
// by TranslationTestScreen.tsx, now reachable via Settings > Advanced).
jest.mock('onnxruntime-react-native', () => ({
  InferenceSession: {create: jest.fn()},
  Tensor: jest.fn(),
}));

// @huggingface/tokenizers likewise has no native module available.
jest.mock('@huggingface/tokenizers', () => ({
  Tokenizer: {fromFile: jest.fn()},
}));

// react-native-keychain's native module isn't available under Jest either --
// hit via secureStorage.ts (SettingsTabScreen.tsx -> RootNavigator.tsx).
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

// react-native-tts constructs a NativeEventEmitter from its native module at
// import time, which is null under Jest -- hit via ttsService.ts
// (ChatScreen.tsx -> RootNavigator.tsx).
jest.mock('react-native-tts', () => ({
  __esModule: true,
  default: {
    getInitStatus: jest.fn(() => Promise.resolve()),
    setDefaultLanguage: jest.fn(),
    setDucking: jest.fn(),
    speak: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
  },
}));
