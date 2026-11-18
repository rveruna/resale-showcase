/**
 * @fileoverview Disallow binding functions with an optional or default-valued
 * first parameter directly to JSX event-handler props.
 *
 * Why: React Native / RN-Web event handlers like `onPress` are invoked with a
 * synthetic event regardless of how the prop is typed. If the bound function
 * has an optional first parameter (`(x?: T) => void`) or a parameter default
 * (`(x: T = 'default') => void`), TypeScript happily accepts the binding —
 * fewer-parameter functions are structurally assignable to zero-arg prop
 * types — but at runtime the event becomes `x`, the default never fires,
 * and downstream state is corrupted.
 *
 * The fix: wrap at the binding site so the event is discarded:
 *   onPress={() => fn()}
 */

const ts = require('typescript');

const HANDLER_NAME_REGEX = /^on[A-Z]/;

function getFirstParamDeclaration(signature) {
  const params = signature.getParameters();
  if (params.length === 0) return null;
  const symbol = params[0];
  // Parameter symbols from a call signature always declare to a
  // ParameterDeclaration. Don't gate on `ts.isParameter()` — when this rule
  // loads from a different typescript install than the parser's (different
  // SyntaxKind enum values), the identity check fails silently.
  if (symbol.valueDeclaration) return symbol.valueDeclaration;
  if (symbol.declarations && symbol.declarations.length > 0) return symbol.declarations[0];
  return null;
}

function isFirstParamOptional(signature) {
  const declaration = getFirstParamDeclaration(signature);
  if (!declaration) return false;
  // Optional via `?` marker, or via a default-value initializer. Both make
  // the parameter omittable from the caller's perspective and therefore
  // allow the event-handler's runtime argument to slip into the slot.
  return Boolean(declaration.questionToken) || Boolean(declaration.initializer);
}

function collectCallSignatures(type, checker) {
  const signatures = [];
  const visit = (t) => {
    const direct = checker.getSignaturesOfType
      ? checker.getSignaturesOfType(t, ts.SignatureKind.Call)
      : t.getCallSignatures();
    for (const sig of direct) signatures.push(sig);
    if (t.isUnion && t.isUnion()) {
      for (const constituent of t.types) visit(constituent);
    } else if (t.isIntersection && t.isIntersection()) {
      for (const constituent of t.types) visit(constituent);
    }
  };
  visit(type);
  return signatures;
}

function resolveDeclaredType(tsNode, checker) {
  // `getTypeAtLocation` at a JSX attribute use site is contextually narrowed
  // by the prop's expected type — `(x?: T) => void` becomes `() => void` and
  // the optional parameter disappears. To detect the original signature, we
  // resolve to the symbol and ask for its type at its own declaration.
  const symbol = checker.getSymbolAtLocation(tsNode);
  if (symbol && symbol.valueDeclaration) {
    return checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
  }
  if (symbol && symbol.declarations && symbol.declarations.length > 0) {
    return checker.getTypeOfSymbolAtLocation(symbol, symbol.declarations[0]);
  }
  return checker.getTypeAtLocation(tsNode);
}

function hasOptionalFirstParam(expression, parserServices, checker) {
  const tsNode = parserServices.esTreeNodeToTSNodeMap.get(expression);
  if (!tsNode) return false;
  const type = resolveDeclaredType(tsNode, checker);
  if (!type) return false;
  const signatures = collectCallSignatures(type, checker);
  if (signatures.length === 0) return false;
  // If *any* signature has an optional/defaulted first parameter, the
  // binding is unsafe — runtime invocation may route the event into that
  // parameter slot.
  return signatures.some(isFirstParamOptional);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow binding a function with an optional or default-valued first parameter directly to a JSX event-handler prop',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      defaultArgHandler:
        "'{{name}}' has an optional or defaulted first parameter, so binding it directly to '{{prop}}' lets the event argument override the default. Wrap at the binding site with an arrow that discards the event.",
    },
    schema: [],
  },

  create(context) {
    // ESLint flat config exposes parser services on `context.sourceCode`;
    // the legacy path is `context.parserServices`. Support both so the rule
    // works in either harness (production lint + the unit-test Linter).
    const parserServices =
      (context.sourceCode && context.sourceCode.parserServices) || context.parserServices;
    if (!parserServices || !parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
      // Type-aware rule — without parser services we cannot resolve the
      // signature of the bound function, so we skip silently.
      return {};
    }
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return;
        const propName = node.name.name;
        if (!HANDLER_NAME_REGEX.test(propName)) return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expression = node.value.expression;
        if (!expression) return;
        // Only flag bare references — `foo`, `obj.foo`. Inline arrows /
        // function expressions / call expressions are by-definition wrapped
        // at the binding site (the wrapper either swallows the event or
        // forwards it on the user's own terms).
        if (expression.type !== 'Identifier' && expression.type !== 'MemberExpression') {
          return;
        }
        if (!hasOptionalFirstParam(expression, parserServices, checker)) return;
        const name = context.getSourceCode().getText(expression);
        context.report({
          node,
          messageId: 'defaultArgHandler',
          data: { name, prop: propName },
        });
      },
    };
  },
};
