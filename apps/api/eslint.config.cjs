const { createBaseConfig } = require('@resale/config/eslint');

// Layer rules (docs/architecture.md, Backend): routes → services → (domain,
// repositories). Only repositories touch the database, so Drizzle and the
// schema are off limits everywhere else.
const layer = (name) => ({ regex: `(^|/)${name}(/|$)`, message: `Layer rule: no ${name} here.` });
const database = [
  { regex: '^drizzle-orm', message: 'Only repositories touch the database.' },
  { regex: '^@resale/db/schema', message: 'Only repositories touch the database.' },
];

const forbidden = {
  routes: [layer('repositories'), ...database],
  services: [layer('routes'), ...database],
  repositories: [layer('routes'), layer('services')],
};

module.exports = [
  ...createBaseConfig({ tsconfigRootDir: __dirname }),
  ...Object.entries(forbidden).map(([folder, patterns]) => ({
    files: [`src/${folder}/**/*.ts`],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns }] },
  })),
  // The structured logger and the seed script are the places that write to the console.
  { files: ['src/lib/log.ts', 'scripts/**'], rules: { 'no-console': 'off' } },
];
