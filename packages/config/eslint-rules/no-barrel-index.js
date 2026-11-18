/**
 * @fileoverview Forbid barrel index files.
 * @description `index.ts` / `index.tsx` re-export barrels collapse the module
 * graph so jest and turbo cannot tell which leaf changed, and they invite
 * import cycles. Import concrete modules directly (e.g. `./item/itemStatus`).
 * Real entry points (e.g. expo-router's app/**) are exempt via the config's
 * `ignores`, so this rule fires on any index file it lints.
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow barrel index.ts/index.tsx re-export files',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      barrelIndex:
        'Barrel index files are banned: they collapse the module graph so jest/turbo cannot detect which leaf changed. Delete this file and import concrete modules directly.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename.replace(/\\/g, '/');
    if (!/(^|\/)index\.(ts|tsx)$/.test(filename)) return {};
    return {
      Program(node) {
        context.report({ node, messageId: 'barrelIndex' });
      },
    };
  },
};
