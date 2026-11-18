# @resale/api

Hono on Cloudflare Workers, run locally by Wrangler on a local D1 database.

- `pnpm dev`: the API on http://localhost:8787 (seeds demo data on first run)
- `pnpm db:reset`: fresh database from the migrations, plus the demo data
- `pnpm test`: the real routes against an in-memory SQLite built from the same migrations
- `pnpm types`: emits `AppType` for the admin app's typed client (turbo runs it first)

Routes: `GET /items`, `GET /items/choices`, `POST /items`, `POST /items/status` (bulk),
`GET|PATCH|DELETE /items/:id`, `GET /items/:id/changes`, `POST /items/:id/status`,
`POST /items/:id/duplicate`.
