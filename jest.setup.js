// Global Jest setup. AsyncStorage's real native module isn't available under
// Jest (no device/emulator), so any test that transitively imports it
// (including __tests__/App.test.tsx, via App.tsx -> src/storage/asyncStore.ts)
// needs this mock, not just tests that use AsyncStorage directly.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
