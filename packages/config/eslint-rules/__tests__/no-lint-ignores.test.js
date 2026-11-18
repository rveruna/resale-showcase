/**
 * Unit tests for the no-lint-ignores ESLint rule.
 */

const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('../no-lint-ignores');

function lint(code) {
  const linter = new Linter({ configType: 'flat' });
  const config = {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    linterOptions: { noInlineConfig: true },
    plugins: { local: { rules: { 'no-lint-ignores': rule } } },
    rules: { 'local/no-lint-ignores': 'error' },
  };
  return linter
    .verify(code, config, { filename: 'src/item.ts' })
    .filter((m) => m.ruleId === 'local/no-lint-ignores');
}

describe('no-lint-ignores', () => {
  it.each([
    '// eslint-disable-next-line no-console',
    '// eslint-disable-line',
    '/* eslint-disable */',
    '// @ts-ignore',
    '// @ts-expect-error: wrong type',
    '// @ts-nocheck',
  ])('flags %s', (comment) => {
    expect(lint(`${comment}\nexport const x = 1;`)).toHaveLength(1);
  });

  it('does not flag an ordinary comment that mentions the words', () => {
    expect(
      lint(`// we never use eslint-disablement or ts-ignore here\nexport const x = 1;`),
    ).toHaveLength(0);
  });
});
