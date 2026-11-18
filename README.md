# Resale admin: showcase

A working slice of a production system I build and run for my second-hand clothing
business: one central inventory that feeds my own web shop and the marketplaces I sell
on. The real repository is private. This one keeps its architecture, tooling and coding
style, with demo data and the inventory and item editing parts only.

**Stack:** TypeScript monorepo (pnpm + Turborepo) · Expo / React Native (iOS, Android, web)
· Expo Router · **TanStack Query + TanStack DB** · Hono on Cloudflare Workers · D1 (SQLite)

- Drizzle · Zod · Jest, Testing Library, Vitest · Storybook

## Run it

Node 24 and pnpm (`corepack enable`). No Cloudflare account needed: the API runs on
Wrangler's local D1.

```sh
pnpm install
pnpm dev          # API on :8787 (seeds 60 demo items on first run) + the app on :8081
```

The app opens in the browser. For a phone, run `pnpm --filter @resale/admin start` instead
of the app half and scan the QR code with Expo Go (the app finds the API on your
machine's address). `pnpm --filter @resale/api db:reset`
restores the demo data.

```sh
pnpm check                                  # lint, typecheck and every test
pnpm --filter @resale/admin storybook      # every view in every state
```

## Where to look

| What                                    | Where                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| TanStack DB collection on Query         | [`itemsCollection.ts`](apps/admin/src/inventory/itemsCollection.ts)             |
| Optimistic bulk action with rollback    | [`statusChange.ts`](apps/admin/src/inventory/statusChange.ts)                   |
| Live query + client-side list rules     | [`useInventory.ts`](apps/admin/src/inventory/useInventory.ts)                   |
| Query + mutations, syncing the list     | [`useItem.ts`](apps/admin/src/item/useItem.ts)                                  |
| `queryOptions` factories and key design | [`itemQueries.ts`](apps/admin/src/item/itemQueries.ts)                          |
| Typed API client, error mapping         | [`apiResponse.ts`](apps/admin/src/api/apiResponse.ts)                           |
| Screen tests faking only `fetch`        | [`InventoryScreen.test.tsx`](apps/admin/src/inventory/InventoryScreen.test.tsx) |
| Shared business rules                   | [`packages/domain`](packages/domain/src)                                        |
| Versioned, atomic saves                 | [`itemsRepository.ts`](apps/api/src/repositories/itemsRepository.ts)            |
| Layer rules enforced by lint            | [`apps/api/eslint.config.cjs`](apps/api/eslint.config.cjs)                      |

[`docs/architecture.md`](docs/architecture.md) has the rules the code follows, and
[`docs/decisions.md`](docs/decisions.md) the reasons behind the main choices.

## Things to try

- **Optimistic update:** set `"SLOW_MS": "1500"` in `apps/api/wrangler.jsonc`, tick a few
  items and press Archive. They leave the list at once; the server confirms 1.5 s later.
- **Rollback:** open the app in two browser tabs. In tab A open an item and change its
  price. In tab B (still on the old version) tick that item and press Archive. It
  disappears, the API refuses with `VERSION_CONFLICT`, the row comes back, and the list
  reloads fresh versions for another go.
- **Conflict on the item screen:** open the same item in both tabs, save in one, then save
  in the other: "This item changed since you opened it" with Reload.
- **Shared rules:** tick "eBay" on an item with no price. The form refuses with the same
  message the API would send, because both run `editItem` from `packages/domain`.

## What's left out

The production app also has sign-in (Better Auth with two-factor), photos (R2, an on-device
camera and a Skia editor), the web shop (Astro), orders and Stripe checkout, marketplace
integrations through queues, and a data import. They're out of scope here; the patterns
above are the same ones they use.
