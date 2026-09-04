module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  // Several RN ecosystem packages ship ESM builds that need transforming --
  // default transformIgnorePatterns would otherwise skip them as "just
  // another node_modules package".
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-fs|react-native-tts|@react-navigation)/)',
  ],
};
