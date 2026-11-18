const { Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('../no-unnecessary-react-import');

function buildConfig() {
  return {
    files: ['**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      local: { rules: { 'no-unnecessary-react-import': rule } },
    },
    rules: { 'local/no-unnecessary-react-import': 'error' },
  };
}

function lint(code) {
  const linter = new Linter({ configType: 'flat' });
  return linter
    .verify(code, buildConfig(), { filename: 'Component.tsx' })
    .filter((m) => m.ruleId === 'local/no-unnecessary-react-import');
}

function fix(code) {
  const linter = new Linter({ configType: 'flat' });
  return linter.verifyAndFix(code, buildConfig(), { filename: 'Component.tsx' }).output;
}

describe('no-unnecessary-react-import', () => {
  it('flags a default React import with no React. reference', () => {
    const messages = lint(`
      import React from 'react';
      export const Thing = () => <div />;
    `);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('Unnecessary default');
  });

  it('does not flag React.memo usage', () => {
    const messages = lint(`
      import React from 'react';
      export const Thing = React.memo(() => <div />);
    `);
    expect(messages).toHaveLength(0);
  });

  it('does not flag a React.FC type reference', () => {
    const messages = lint(`
      import React from 'react';
      const Thing: React.FC = () => <div />;
    `);
    expect(messages).toHaveLength(0);
  });

  it('does not flag a <React.Fragment> tag', () => {
    const messages = lint(`
      import React from 'react';
      export const Thing = () => <React.Fragment><div /></React.Fragment>;
    `);
    expect(messages).toHaveLength(0);
  });

  it('does not flag files with no default React import', () => {
    const messages = lint(`
      import { useState } from 'react';
      export const Thing = () => { useState(0); return <div />; };
    `);
    expect(messages).toHaveLength(0);
  });

  it('flags even when a named import is also present', () => {
    const messages = lint(`
      import React, { useState } from 'react';
      export const Thing = () => { useState(0); return <div />; };
    `);
    expect(messages).toHaveLength(1);
  });

  it('does not flag a <React.Fragment> tag when a named import is also present', () => {
    const messages = lint(`
      import React, { useState } from 'react';
      export const Thing = () => { useState(0); return <React.Fragment><div /></React.Fragment>; };
    `);
    expect(messages).toHaveLength(0);
  });

  it('removes the whole import when React is the only specifier', () => {
    const output = fix(`import React from 'react';\nexport const Thing = () => <div />;\n`);
    expect(output).toBe(`export const Thing = () => <div />;\n`);
  });

  it('strips just the React specifier when named imports are also present', () => {
    const output = fix(
      `import React, { useState } from 'react';\nexport const Thing = () => { useState(0); return <div />; };\n`,
    );
    expect(output).toBe(
      `import { useState } from 'react';\nexport const Thing = () => { useState(0); return <div />; };\n`,
    );
  });
});
