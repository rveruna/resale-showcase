/**
 * @fileoverview Local ESLint rules plugin
 * @description Custom rules shared by every package.
 */

const noLintIgnores = require('./no-lint-ignores');
const noBarrelIndex = require('./no-barrel-index');
const noDefaultArgEventHandler = require('./no-default-arg-event-handler');
const noUnnecessaryReactImport = require('./no-unnecessary-react-import');
const noPlatformSelectWithoutDefault = require('./no-platform-select-without-default');

module.exports = {
  rules: {
    'no-lint-ignores': noLintIgnores,
    'no-barrel-index': noBarrelIndex,
    'no-default-arg-event-handler': noDefaultArgEventHandler,
    'no-unnecessary-react-import': noUnnecessaryReactImport,
    'no-platform-select-without-default': noPlatformSelectWithoutDefault,
  },
};
