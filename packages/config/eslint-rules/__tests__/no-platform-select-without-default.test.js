const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('../no-platform-select-without-default');

function lint(code) {
  const linter = new Linter({ configType: 'flat' });
  const config = {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    plugins: {
      local: { rules: { 'no-platform-select-without-default': rule } },
    },
    rules: { 'local/no-platform-select-without-default': 'error' },
  };
  return linter
    .verify(code, config, { filename: 'styles.ts' })
    .filter((m) => m.ruleId === 'local/no-platform-select-without-default');
}

describe('no-platform-select-without-default', () => {
  it('flags a select with only ios and android branches', () => {
    const messages = lint(`const s = Platform.select({ ios: 1, android: 2 });`);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('default');
  });

  it('flags a select with an empty options object', () => {
    expect(lint(`const s = Platform.select({});`)).toHaveLength(1);
  });

  it('allows a select with a default branch', () => {
    expect(lint(`const s = Platform.select({ ios: 1, default: 2 });`)).toHaveLength(0);
  });

  it('allows a quoted default key', () => {
    expect(lint(`const s = Platform.select({ ios: 1, 'default': 2 });`)).toHaveLength(0);
  });

  it('does not judge an object that spreads or computes keys', () => {
    expect(lint(`const s = Platform.select({ ...shared, ios: 1 });`)).toHaveLength(0);
    expect(lint(`const s = Platform.select({ [key]: 1 });`)).toHaveLength(0);
  });

  it('does not judge a non-literal options argument', () => {
    expect(lint(`const s = Platform.select(options);`)).toHaveLength(0);
  });

  it('ignores select calls on other objects', () => {
    expect(lint(`const s = Other.select({ ios: 1 });`)).toHaveLength(0);
  });
});
