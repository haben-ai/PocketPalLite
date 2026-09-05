module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  // lucide-react-native's package.json "exports" map points the
  // "react-native" condition (which Jest's react-native preset also
  // resolves against, same as Metro) at its ESM .mjs build -- Metro
  // handles that fine at real build time, but Jest's transform doesn't
  // parse raw ESM `export` syntax for .mjs out of the box. Forcing
  // resolution to the CJS build sidesteps that; it only affects Jest, not
  // the actual app bundle.
  moduleNameMapper: {
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Several RN ecosystem packages ship ESM builds that need transforming --
  // default transformIgnorePatterns would otherwise skip them as "just
  // another node_modules package".
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-fs|react-native-tts|lucide-react-native|@react-navigation)/)',
  ],
};
