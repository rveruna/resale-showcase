/**
 * @fileoverview ESLint rule to forbid lint-ignore directives
 * @description Blocks `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, and
 * `@ts-nocheck` comments.
 * If a rule needs to be silenced, the underlying issue should be fixed or the
 * rule itself relaxed via configuration — not papered over with a per-line
 * escape hatch.
 */

const ESLINT_DISABLE_REGEX = /(^|\s)eslint-disable(-next-line|-line)?(\s|$|[:,])/;
const TS_IGNORE_REGEX = /(^|\s)@ts-(ignore|expect-error|nocheck)(\s|$|:)/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow eslint-disable and @ts-ignore directives',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      eslintDisable:
        'eslint-disable directives are not allowed. Fix the underlying issue or relax the rule in packages/config/eslint.base.js instead of silencing it locally.',
      tsIgnore:
        '@ts-ignore / @ts-expect-error / @ts-nocheck directives are not allowed. Fix the underlying type issue instead of silencing it locally.',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program() {
        const comments = sourceCode.getAllComments();
        for (const comment of comments) {
          const text = comment.value;
          if (!comment.loc) continue;

          if (ESLINT_DISABLE_REGEX.test(text)) {
            context.report({
              loc: comment.loc,
              messageId: 'eslintDisable',
            });
            continue;
          }

          if (TS_IGNORE_REGEX.test(text)) {
            context.report({
              loc: comment.loc,
              messageId: 'tsIgnore',
            });
          }
        }
      },
    };
  },
};
