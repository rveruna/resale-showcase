import { missingForListing } from '@resale/domain/item/item';
import { statusActionsFor } from '@resale/domain/item/status';
import type { StoredItem } from '../repositories/itemsRepository';

/**
 * One row of the inventory list: everything the list shows, filters and sorts
 * by, and the version a status change from the list must send back.
 */
export function summaryOf({ item, version }: StoredItem) {
  return {
    id: item.id,
    title: item.title,
    brand: item.brand,
    category: item.category,
    size: item.size,
    status: item.status,
    pricePence: item.pricePence,
    labels: item.labels,
    channels: item.channels,
    createdAt: item.createdAt,
    soldAt: item.soldAt,
    toCheck: missingForListing(item),
    version,
  };
}

export type ItemSummary = ReturnType<typeof summaryOf>;

/** One item for the item screen: every field, its version, and the buttons that apply. */
export function detailOf(stored: StoredItem) {
  return {
    item: stored.item,
    version: stored.version,
    updatedAt: stored.updatedAt,
    toCheck: missingForListing(stored.item),
    statusActions: statusActionsFor(stored.item),
    summary: summaryOf(stored),
  };
}

export type ItemDetail = ReturnType<typeof detailOf>;
