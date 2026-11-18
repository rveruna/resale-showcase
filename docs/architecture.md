# Architecture

The rules the code follows. If code breaks one, the code or this doc changes in the same
commit.

```
packages/domain   pure business rules: no I/O, no Date.now(), no framework imports
packages/db       Drizzle schema + generated SQL migrations for D1 (SQLite)
packages/config   shared ESLint (incl. custom rules) and TypeScript config
apps/api          Hono on Cloudflare Workers
apps/admin        Expo (iOS, Android, web): Expo Router, TanStack Query + TanStack DB
```

## Domain

- Every rule lives once, in `packages/domain`, and both sides run it: the API to refuse a
  bad write, the app to say what's wrong before sending, and to compute optimistic state.
  `editItem`, `applyStatusAction` and `listInventory` are the three that matter most.
- Functions take the current time and ids as arguments, so they're deterministic and
  tested without mocks.
- Expected failures are values (`Result<T, 'ITEM_NOT_AVAILABLE'>`), not exceptions.
  Exceptions are for bugs and outages.

## Backend

```
apps/api/src/
  routes/        HTTP only: Zod-validate input, call one service, map its result
  services/      use cases: load, run domain rules, save
  repositories/  the only code that touches the database
```

- Dependencies point one way: routes → services → (domain, repositories). ESLint enforces
  it (`apps/api/eslint.config.cjs`): a route importing Drizzle fails lint.
- One error shape for every failure: `{ error: { code, message } }` with the right status.
  The app switches on `code` (e.g. `VERSION_CONFLICT`), never on the message.
- Structured JSON logs, one per request, with a request id; failures log their code.

## Data

- Money: integer pence. Time: UTC milliseconds. IDs: UUIDv7 (sortable by creation time).
- **History is append-only**: every write records one `item_changes` row per changed
  field, grouped by `saveId`, so the item screen shows one block per press of Save.

## Writes

- **Optimistic concurrency.** Items carry a `version`. A save sends the version it loaded;
  the update sets `version = CASE WHEN version = :loaded THEN version + 1 END`. A stale
  version makes that `NULL`, the `NOT NULL` column refuses it, and D1 rolls back the whole
  `db.batch` (the history rows with it). No lost updates, no half-written history.
- Multi-statement writes go through `writeTogether` (`db.batch` on D1, one transaction).
- Bulk status changes are all-or-nothing: one refusal refuses the lot.

## Admin app

```
app/              Expo Router routes: re-export a screen, nothing else
src/<feature>/
  XScreen.tsx     container: hooks, data, navigation; renders XView; no styles
  XView.tsx       props only: no API or router hooks; has stories
  useX.ts         data and side effects for one feature
  x.ts            pure helpers for the feature
src/api/          the typed API client (`api`, `unwrap`), the query cache
src/testing/      `fakeApi`: tests answer requests at `fetch`, through the real client
```

- **Views take props only**, so every state can be shown in a story.
  `src/everyComponentHasAStory.test.ts` fails the build if a component has none.
- React Compiler is on: no `useMemo` / `useCallback` / `memo` for speed.
- Platform differences go in `.web.ts` / `.native.ts` files; `Platform.OS` is banned by lint.

## Server data

- **Entities live in a TanStack DB collection** (`itemsCollection`), loaded whole through
  TanStack Query (`queryCollectionOptions`, key `['items']`) and read with
  `useLiveQuery`. The inventory is ~1,300 items in the real app, so filtering, sorting,
  search and paging run on the device with the domain's `listInventory`: every query
  answers instantly and the rules stay in one place. Revisit (query-driven sync) past
  ~10,000 items.
- **List-level edits are optimistic** (`inventory/statusChange.ts`): a bulk status button
  is a `createOptimisticAction`. `onMutate` applies the domain rule to the rows at once;
  `mutationFn` calls the API and writes the server's rows (new versions) back with
  `utils.writeUpdate` before the optimistic layer is dropped. If the API refuses, TanStack
  DB rolls every row back, and a `VERSION_CONFLICT` refetches for fresh versions.
- **One item with all its fields is a query** (`['item', id]`, `queryOptions` factories in
  `item/itemQueries.ts`). Saving is a `useMutation`; on success it `setQueryData`s the
  answer, writes the row into `itemsCollection` so the list is right without reloading,
  and invalidates the history and the suggestions. Unsaved edits live in the form, keyed
  by the version they started from, so a reload or a newer version starts afresh and
  there's nothing to roll back.
- **Everything else uses Query directly** (`useQuery` for suggestions and history).
  No hand-rolled `useState` + `fetch`.
- **Hono's typed client** (`api.items[':id'].$patch(...)`, wrapped in `unwrap`): request and
  response types come from the API's routes (`AppType`), so the app keeps no copies of
  response shapes. Turbo builds the API's types before the app's lint and typecheck.
- **Errors are shown, never swallowed.** A failed load says so with Try again; a refused
  save says why and offers Reload on a conflict. Every promise started with `void` or
  `.then` catches its own errors.

## Testing

- `packages/domain`: Jest unit tests for every rule.
- `apps/api`: Vitest against the **real routes and a real SQLite database** built from the
  same migrations as D1 (`createTestDb`), via `app.request()`. No mocked repositories.
- `apps/admin`: Jest + Testing Library on whole screens. Only `fetch` is faked
  (`fakeApi`), so each test runs the real typed client, Query cache and TanStack DB
  collection, including the optimistic update and its rollback.
- Storybook builds in CI, so a story that stops compiling fails the build.
