/**
 * Unit tests for the no-barrel-index ESLint rule.
 *
 * The rule keys off the filename, so each case is linted with an explicit
 * filename via the Linter API.
 */

const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('../no-barrel-index');

function lint(code, filename) {
  const linter = new Linter({ configType: 'flat' });
  const config = {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { local: { rules: { 'no-barrel-index': rule } } },
    rules: { 'local/no-barrel-index': 'error' },
  };
  return linter
    .verify(code, config, { filename })
    .filter((m) => m.ruleId === 'local/no-barrel-index');
}

describe('no-barrel-index', () => {
  it('flags an index.ts barrel', () => {
    const messages = lint(`export { Button } from './Button';`, 'components/Button/index.ts');
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('Barrel index files are banned');
  });

  it('flags an index.tsx barrel', () => {
    expect(lint(`export * from './Foo';`, 'features/Foo/index.tsx')).toHaveLength(1);
  });

  it('flags an empty index file', () => {
    expect(lint(``, 'x/index.ts')).toHaveLength(1);
  });

  it('does not flag a concrete module file', () => {
    expect(lint(`export const Button = () => null;`, 'components/Button/Button.tsx')).toHaveLength(
      0,
    );
  });

  it('does not flag a file merely named like index', () => {
    expect(lint(`export const x = 1;`, 'components/indexHelper.ts')).toHaveLength(0);
  });
});
