const { createBaseConfig } = require('./eslint.base');

module.exports = [
  // Intentionally-buggy fixtures for eslint-base.test.js.
  { ignores: ['eslint-rules/__fixtures__/**'] },
  ...createBaseConfig({ tsconfigRootDir: __dirname }),
  {
    // The rule tests embed directive comments as code under test.
    files: ['eslint-rules/__tests__/**'],
    rules: { 'local/no-lint-ignores': 'off' },
  },
];
