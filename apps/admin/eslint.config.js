const { createReactNativeConfig } = require('@resale/config/eslint-react-native');

module.exports = [
  {
    ignores: ['dist/**', 'storybook-static/**', '.expo/**', 'web-build/**'],
  },
  ...createReactNativeConfig({ tsconfigRootDir: __dirname }),
  {
    // Expo Router's route for `/`, not a barrel.
    files: ['app/**/index.tsx'],
    rules: { 'local/no-barrel-index': 'off' },
  },
];
