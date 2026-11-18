// @ts-check
/**
 * Shared ESLint flat config for every TypeScript package.
 * React Native rules are in eslint.react-native.js; the API adds its layer-import
 * rules (docs/architecture.md, Backend).
 */

const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');
const localRules = require('./eslint-rules/plugin');

const TEST_FILE_GLOBS = ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.steps.ts'];

/**
 * @param {{ tsconfigRootDir: string }} options the calling package's directory
 */
function createBaseConfig({ tsconfigRootDir }) {
  return [
    {
      ignores: [
        '**/node_modules/**',
        '**/coverage/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/.wrangler/**',
      ],
    },

    // Plain JS (config files, ESLint rules): CommonJS on Node.
    {
      files: ['**/*.js'],
      languageOptions: {
        ecmaVersion: 2023,
        sourceType: 'commonjs',
        globals: {
          require: 'readonly',
          module: 'writable',
          __dirname: 'readonly',
          process: 'readonly',
          console: 'readonly',
          describe: 'readonly',
          it: 'readonly',
          expect: 'readonly',
        },
      },
      plugins: {
        'unused-imports': unusedImports,
      },
      rules: {
        eqeqeq: ['error', 'always'],
        'unused-imports/no-unused-imports': 'error',
      },
    },

    {
      name: 'ts-base',
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: typescriptParser,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        '@typescript-eslint': typescript,
        import: importPlugin,
        'unused-imports': unusedImports,
      },
      rules: {
        ...typescript.configs.recommended?.rules,
        // No console in app code; logging goes through a structured logger
        // (docs/architecture.md, Backend). Tests are exempted below.
        'no-console': ['error'],
        // Disable base rule — unused-imports/no-unused-vars handles this with auto-fix support
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'error',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/unbound-method': 'error',
        // Ban type assertions (e.g. `value as Foo`). They bypass the type-checker;
        // prefer type guards or Zod validation. `as const` is allowed.
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          {
            allowString: false,
            allowNumber: false,
            allowNullableObject: true,
            allowNullableBoolean: true,
            allowNullableString: false,
            allowNullableNumber: false,
            allowNullableEnum: false,
            allowAny: false,
          },
        ],
        eqeqeq: ['error', 'always'],
        // Combine imports from same module into single statement
        'import/no-duplicates': 'error',
        // Sort members alphabetically within import braces: { A, B, C }
        'sort-imports': [
          'error',
          {
            ignoreCase: true,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
          },
        ],
      },
    },

    // Console and terse type assertions are fine in tests.
    {
      files: TEST_FILE_GLOBS,
      rules: {
        'no-console': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
      },
    },

    // Fix the underlying issue or relax the rule here — never a per-line escape hatch.
    // Everywhere, not just some folders: this repo starts clean.
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js'],
      plugins: { local: localRules },
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      rules: {
        'local/no-lint-ignores': 'error',
      },
    },

    // Barrel index files are banned. Entry points that need an index file opt out
    // in their own package's eslint.config.js.
    {
      files: ['**/index.ts', '**/index.tsx'],
      plugins: { local: localRules },
      rules: {
        'local/no-barrel-index': 'error',
      },
    },
  ];
}

module.exports = { createBaseConfig };
