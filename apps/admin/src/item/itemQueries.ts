import { queryOptions } from '@tanstack/react-query';
import { api } from '../api/apiClient';
import { unwrap } from '../api/apiResponse';

const fetchItem = (id: string) => unwrap(api.items[':id'].$get({ param: { id } }));
const fetchChoices = () => unwrap(api.items.choices.$get());
const fetchChanges = (id: string) => unwrap(api.items[':id'].changes.$get({ param: { id } }));

/** `GET /items/:id`, as JSON (dates are strings). */
export type ItemDetail = Awaited<ReturnType<typeof fetchItem>>;
/** `GET /items/choices`: the brands and labels in use, for suggestions. */
export type ItemChoices = Awaited<ReturnType<typeof fetchChoices>>;
/** `GET /items/:id/changes`: one row per changed field, newest save first. */
export type ItemChanges = Awaited<ReturnType<typeof fetchChanges>>['changes'];

/**
 * One item with all its fields and its version, for the item screen. Not
 * `['items', …]`: that's the list's collection.
 */
export const itemQuery = (id: string) =>
  queryOptions({ queryKey: ['item', id], queryFn: () => fetchItem(id) });

/** The suggestions; a save that adds a brand or label loads them again. */
export const itemChoicesQuery = queryOptions({ queryKey: ['itemChoices'], queryFn: fetchChoices });

/** The item's history; every save and status button loads it again. */
export const itemChangesQuery = (id: string) =>
  queryOptions({ queryKey: ['item', id, 'changes'], queryFn: () => fetchChanges(id) });
