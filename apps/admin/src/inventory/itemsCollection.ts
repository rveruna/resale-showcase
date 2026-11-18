import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { createCollection } from '@tanstack/react-db';
import { api } from '../api/apiClient';
import { unwrap } from '../api/apiResponse';
import { queryClient } from '../api/queryClient';

async function fetchItems() {
  return (await unwrap(api.items.$get())).items;
}

/** One row of the inventory, as `GET /items` sends it. */
export type InventoryItem = Awaited<ReturnType<typeof fetchItems>>[number];

/**
 * Every item, loaded once through Query (`['items']`); screens read it with live
 * queries, and edits apply here first (docs/architecture.md, Server data).
 */
export const itemsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['items'],
    queryFn: fetchItems,
    queryClient,
    getKey: (item) => item.id,
  }),
);
