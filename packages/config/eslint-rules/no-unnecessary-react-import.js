// unused-imports/no-unused-imports won't catch this: JSX implicitly marks React as "used".
/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Disallow a default `React` import when `React.` is never referenced',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      unnecessaryReactImport:
        "Unnecessary default `import React from 'react'` — the JSX transform doesn't need it. Only import it when you reference `React.` directly (a hook, `React.memo`, `React.Fragment`, etc.).",
    },
    schema: [],
  },

  create(context) {
    let reactImportNode = null;
    let reactDefaultSpecifier = null;
    let reactLocalName = null;
    let usedDirectly = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react') return;
        const defaultSpec = node.specifiers.find(
          (specifier) => specifier.type === 'ImportDefaultSpecifier',
        );
        if (defaultSpec) {
          reactImportNode = node;
          reactDefaultSpecifier = defaultSpec;
          reactLocalName = defaultSpec.local.name;
        }
      },
      Identifier(node) {
        if (!reactLocalName || node.name !== reactLocalName) return;
        if (node.parent && node.parent.type === 'ImportDefaultSpecifier') return;
        usedDirectly = true;
      },
      // <React.Fragment> parses as JSXIdentifier, not Identifier — a separate visitor is needed.
      JSXIdentifier(node) {
        if (!reactLocalName || node.name !== reactLocalName) return;
        usedDirectly = true;
      },
      'Program:exit'() {
        if (reactImportNode && !usedDirectly) {
          context.report({
            node: reactImportNode,
            messageId: 'unnecessaryReactImport',
            fix(fixer) {
              const sourceCode = context.sourceCode ?? context.getSourceCode();
              if (reactImportNode.specifiers.length === 1) {
                const text = sourceCode.getText();
                let end = reactImportNode.range[1];
                if (text[end] === '\r' && text[end + 1] === '\n') end += 2;
                else if (text[end] === '\n') end += 1;
                return fixer.removeRange([reactImportNode.range[0], end]);
              }
              const comma = sourceCode.getTokenAfter(reactDefaultSpecifier);
              const afterComma = sourceCode.getTokenAfter(comma);
              return fixer.removeRange([reactDefaultSpecifier.range[0], afterComma.range[0]]);
            },
          });
        }
      },
    };
  },
};
