// A `Platform.select` with only ios/android branches resolves to `undefined` on web.
const isPlatformSelect = (callee) =>
  callee.type === 'MemberExpression' &&
  !callee.computed &&
  callee.object.type === 'Identifier' &&
  callee.object.name === 'Platform' &&
  callee.property.name === 'select';

// A spread or computed key could supply `default`, so only a fully literal object is judged.
const mayDefineDefault = (property) =>
  property.type !== 'Property' ||
  property.computed ||
  (property.key.type === 'Identifier' && property.key.name === 'default') ||
  (property.key.type === 'Literal' && property.key.value === 'default');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a `default` branch in `Platform.select`',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      missingDefault:
        'Platform.select needs a `default` branch — ios/android-only branches spread `undefined` on web, silently dropping styles.',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isPlatformSelect(node.callee)) return;
        const [options] = node.arguments;
        if (!options || options.type !== 'ObjectExpression') return;
        if (options.properties.some(mayDefineDefault)) return;
        context.report({ node, messageId: 'missingDefault' });
      },
    };
  },
};
