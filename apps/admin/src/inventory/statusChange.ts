import type { Channel } from '@resale/domain/item/channels';
import {
  applyStatusAction,
  type ItemStatus,
  type StatusAction,
  statusActionsFor,
} from '@resale/domain/item/status';
import { createOptimisticAction } from '@tanstack/react-db';
import { api } from '../api/apiClient';
import { unwrap } from '../api/apiResponse';
import { type InventoryItem, itemsCollection } from './itemsCollection';

type StatusFields = {
  status: ItemStatus;
  soldAt: Date | null;
  archivedAt: Date | null;
  channels: Channel[];
};

/**
 * The row once a status button has run: the domain's own rule on the list's
 * row, so what shows at once is what the API will save. `null` if it refuses.
 */
export function rowAfter(
  row: InventoryItem,
  action: StatusAction,
  now: Date,
): InventoryItem | null {
  const fields: StatusFields = {
    status: row.status,
    soldAt: row.soldAt === null ? null : new Date(row.soldAt),
    archivedAt: null,
    channels: row.channels,
  };
  const changed = applyStatusAction(fields, action, now);
  if (!changed.ok) return null;
  const { status, soldAt, channels } = changed.value;
  return { ...row, status, soldAt: soldAt?.toISOString() ?? null, channels };
}

/** Whether the button does something for every ticked row: the API refuses all or none. */
export const appliesToAll = (action: StatusAction, rows: InventoryItem[]) =>
  rows.length > 0 && rows.every((row) => statusActionsFor(row).includes(action));

/**
 * A status button for many rows at once. The list changes at once (`onMutate`);
 * if the API refuses, TanStack DB rolls the rows back. On success the server's
 * rows, with their new versions, replace the optimistic ones before it settles.
 */
export const changeStatuses = createOptimisticAction<{
  action: StatusAction;
  items: { id: string; version: number }[];
}>({
  onMutate: ({ action, items }) => {
    const now = new Date();
    itemsCollection.update(
      items.map((item) => item.id),
      (drafts) => {
        for (const draft of drafts) Object.assign(draft, rowAfter(draft, action, now));
      },
    );
  },
  mutationFn: async (variables) => {
    const { items } = await unwrap(api.items.status.$post({ json: variables }));
    await itemsCollection.utils.writeUpdate(items);
  },
});
