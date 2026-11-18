/**
 * Lints fixtures with the real shared config, so a broken parser setup or a
 * silently dropped type-aware rule fails here rather than in the first app.
 */

const path = require('path');
const { ESLint } = require('eslint');

const { createBaseConfig } = require('../../eslint.base');

const fixturesDir = path.join(__dirname, '..', '__fixtures__');

async function ruleIdsFor(fileName) {
  const eslint = new ESLint({
    cwd: fixturesDir,
    overrideConfigFile: true,
    overrideConfig: createBaseConfig({ tsconfigRootDir: fixturesDir }),
  });
  const [result] = await eslint.lintFiles([path.join(fixturesDir, fileName)]);
  return result.messages.map((m) => m.ruleId);
}

describe('createBaseConfig', () => {
  it('reports the type-aware and syntax rules on violations.ts', async () => {
    expect(await ruleIdsFor('violations.ts')).toEqual(
      expect.arrayContaining([
        '@typescript-eslint/consistent-type-assertions',
        '@typescript-eslint/no-explicit-any',
        '@typescript-eslint/strict-boolean-expressions',
      ]),
    );
  });

  it('reports nothing on clean.ts', async () => {
    expect(await ruleIdsFor('clean.ts')).toEqual([]);
  });
});
