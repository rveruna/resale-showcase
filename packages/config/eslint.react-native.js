// @ts-check
/**
 * ESLint flat config for React Native / Expo packages: the shared base plus
 * React, hooks and React Native rules.
 */

const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const reactNative = require('eslint-plugin-react-native');
const { createBaseConfig } = require('./eslint.base');
const localRules = require('./eslint-rules/plugin');

// Fork via file extensions (.web.ts, .ios.ts, .native.ts) so platform variance is
// resolved at build time. Flat config replaces `no-restricted-syntax` options per
// block, so any later block setting that rule must spread this in again.
const PLATFORM_OS_BAN = {
  selector: "MemberExpression[object.name='Platform'][property.name='OS']",
  message:
    'Platform.OS is banned. Fork via file extensions (.web.ts, .ios.ts, .native.ts) so platform variance is resolved at build time.',
};

/**
 * @param {{ tsconfigRootDir: string }} options the calling package's directory
 */
function createReactNativeConfig({ tsconfigRootDir }) {
  return [
    ...createBaseConfig({ tsconfigRootDir }),
    {
      name: 'react-native',
      files: ['**/*.ts', '**/*.tsx'],
      plugins: {
        react,
        'react-hooks': reactHooks,
        'react-native': reactNative,
        local: localRules,
      },
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        'react-native/no-inline-styles': 'error',
        'no-restricted-syntax': ['error', PLATFORM_OS_BAN],
        'local/no-unnecessary-react-import': 'error',
        'local/no-platform-select-without-default': 'error',
      },
    },
    // Test mocks legitimately set Platform.OS to simulate a platform.
    {
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    // The runtime event slips into an optional/defaulted first parameter
    // (`onPress={openSettings}`), which TypeScript can't see.
    {
      files: ['**/*.tsx'],
      plugins: { local: localRules },
      rules: {
        'local/no-default-arg-event-handler': 'error',
      },
    },
  ];
}

module.exports = { createReactNativeConfig };
