# @resale/db

The Drizzle schema (`src/schema`) and the SQL migrations it generates (`migrations/`,
never edited by hand once applied). `pnpm --filter @resale/db generate` after a schema
change; the API applies them to its local D1 with `pnpm --filter @resale/api db:reset`.

`src/testing/testDb.ts` builds an in-memory SQLite database from the same migrations
for the API's tests: same SQL dialect as D1, no Cloudflare needed.
