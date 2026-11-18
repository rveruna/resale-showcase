/**
 * Integration test for the no-default-arg-event-handler ESLint rule.
 *
 * The rule is type-aware (it asks the TS type-checker for the declared
 * signature of the bound function), so unit-testing it requires a real
 * TypeScript Program. We point @typescript-eslint/parser at the project's
 * own tsconfig.json and lint two committed fixture files:
 *
 *   - event-handler-violations.tsx — every JSX binding should be reported
 *   - event-handler-clean.tsx      — no bindings should be reported
 *
 * Fixtures live under eslint-rules/__fixtures__/ — outside `__tests__/` so
 * Jest does not try to run them as test files. They are also listed in the
 * main eslint config's `ignores` block so the intentionally-buggy fixture
 * survives `npm run lint`.
 */

const path = require('path');
const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');
const fs = require('fs');

const rule = require('../no-default-arg-event-handler');

const FIXTURES_DIR = path.resolve(__dirname, '..', '__fixtures__');
const PROJECT_DIR = FIXTURES_DIR;

function lintFixture(fileName) {
  const filePath = path.join(FIXTURES_DIR, fileName);
  const code = fs.readFileSync(filePath, 'utf8');
  const linter = new Linter({ configType: 'flat', cwd: PROJECT_DIR });
  const config = {
    files: ['**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: path.join(PROJECT_DIR, 'tsconfig.json'),
        tsconfigRootDir: PROJECT_DIR,
      },
    },
    plugins: {
      local: { rules: { 'no-default-arg-event-handler': rule } },
    },
    rules: { 'local/no-default-arg-event-handler': 'error' },
  };
  return linter.verify(code, config, { filename: filePath });
}

describe('no-default-arg-event-handler', () => {
  it('reports every event-handler binding that has an optional or defaulted first parameter', () => {
    const messages = lintFixture('event-handler-violations.tsx').filter(
      (m) => m.ruleId === 'local/no-default-arg-event-handler',
    );

    // Four binding sites in the fixture: defaulted param, optional param,
    // member-expression handler, and a non-no-arg prop (onSubmenuChange).
    expect(messages).toHaveLength(4);

    const propsAndNames = messages.map((m) => ({
      message: m.message,
    }));

    // Defaulted first param ("submenu: Submenu = 'main'")
    expect(propsAndNames).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "'openSettings' has an optional or defaulted first parameter, so binding it directly to 'onPress'",
        ),
      }),
    );

    // Optional first param ("submenu?: Submenu")
    expect(propsAndNames).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("'openSettingsOptional' has an optional or defaulted"),
      }),
    );

    // Member-expression handler ("handlers.openSettings")
    expect(propsAndNames).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("'handlers.openSettings' has an optional or defaulted"),
      }),
    );

    // Submenu-prop case proves the rule fires regardless of prop shape —
    // any optional-first-param function bound by bare reference is unsafe.
    expect(propsAndNames).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("binding it directly to 'onSubmenuChange'"),
      }),
    );
  });

  it('does not flag safe bindings (wrapper arrow, no-arg fn, rest-only, required-first-param)', () => {
    const messages = lintFixture('event-handler-clean.tsx').filter(
      (m) => m.ruleId === 'local/no-default-arg-event-handler',
    );

    expect(messages).toEqual([]);
  });
});
