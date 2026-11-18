# @resale/domain

The business rules, shared by the API and the admin app: no I/O, no `Date.now()`, no
framework imports. Functions take the current time as an argument, so they're
deterministic and tested without mocks.

- `item/item.ts`: what an item is (Zod), editing it, what it still needs before listing.
- `item/status.ts`: sold, return received, archive, unarchive.
- `item/itemChanges.ts`: an edit as field-by-field history rows.
- `inventory/inventoryList.ts`: the list's views, filters, search and sorts. Runs in the
  app over the whole inventory.
