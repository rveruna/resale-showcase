# Decisions

Why things are the way they are. Each was a real choice in the production app this
showcase is cut from.

## TanStack DB on top of TanStack Query, not Query alone

The list needs instant filtering, sorting and search across the whole inventory, plus
optimistic bulk edits that roll back cleanly. With Query alone that's a hand-written
`setQueryData` dance per mutation, with manual snapshots for rollback. A collection gives
keyed rows, live queries that recompute only what changed, and transactions that roll back
on failure. Query still does the fetching and caching underneath, and everything that
isn't an entity list stays plain Query.

## The item screen is not optimistic

A save can be refused for reasons the user must see (a conflict, a rule), and the form
already holds the unsaved state. Optimistically "saving" would show a state the server
may reject, and then have to undo it while the user keeps typing. So the screen saves
for real, then writes the result into the list's collection.

## Load the whole inventory once

~1,300 items is ~200 KB compressed. One request and then everything is local beats paging
the API on every filter change, and it lets the business rules for the list live in the
domain package rather than being re-implemented as SQL.

## Versions instead of last-write-wins

The real app is edited from a phone, a browser and background marketplace syncs. Without
versions, a stale tab silently overwrites a newer price. The version check costs one
column and one `CASE` and turns that into a clear "this changed, reload" message.

## Hono RPC types instead of OpenAPI codegen

Same TypeScript monorepo, so the API's own route types are the contract. No generator to
run or drift: change a route, the app fails typecheck until it's updated.

## Screen / View split with a story per view

Views take props only, so every state (loading, error, conflict, saving) is a story that
can be looked at without a server. Screens are thin glue and are covered by tests instead.
