const { transformIgnorePatterns } = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jestSetup.js'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // TanStack DB depends on fractional-indexing, which ships only as ES modules.
  transformIgnorePatterns: [
    transformIgnorePatterns[0].replace(
      '|standard-navigation',
      '|standard-navigation|fractional-indexing',
    ),
    ...transformIgnorePatterns.slice(1),
  ],
  testTimeout: 20_000,
};
