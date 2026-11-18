import type { Channel } from '../item/channels';
import type { ListingRequirement } from '../item/item';
import type { ItemStatus } from '../item/status';

/**
 * The list's views: Available by default; To check is what's available but
 * can't be listed yet; Sold, Archived and All as they say.
 */
export const INVENTORY_VIEWS = ['available', 'toCheck', 'sold', 'archived', 'all'] as const;
export type InventoryView = (typeof INVENTORY_VIEWS)[number];

export function statusesIn(view: InventoryView): ItemStatus[] {
  if (view === 'sold') return ['sold'];
  if (view === 'archived') return ['archived'];
  if (view === 'all') return ['available', 'sold', 'archived'];
  return ['available'];
}

export const INVENTORY_SORTS = ['created', 'title', 'price', 'sold'] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export type SortDirection = 'asc' | 'desc';

/** Newest, dearest and latest sale first; titles A to Z. */
export const SORT_DIRECTION: Record<InventorySort, SortDirection> = {
  created: 'desc',
  title: 'asc',
  price: 'desc',
  sold: 'desc',
};

/** What the list shows: a view, a sort, a search, and optionally one label and one channel. */
export type InventoryQuery = {
  view: InventoryView;
  sort: InventorySort;
  /** The sort's own direction when left out; picking the same sort again reverses it. */
  direction?: SortDirection;
  /** Matches the title or the brand, ignoring case. */
  search: string;
  label: string | null;
  channel: Channel | null;
};

export const DEFAULT_QUERY: InventoryQuery = {
  view: 'available',
  sort: 'created',
  search: '',
  label: null,
  channel: null,
};

/** The fields the list rules read. Dates are ISO strings, as the API sends them. */
export type ListedItem = {
  id: string;
  title: string;
  brand: string | null;
  status: ItemStatus;
  pricePence: number | null;
  createdAt: string;
  soldAt: string | null;
  labels: string[];
  channels: Channel[];
  /** What a listing still needs; empty when it's ready. */
  toCheck: ListingRequirement[];
};

const SORT_KEY = {
  created: (item) => item.createdAt,
  title: (item) => item.title,
  price: (item) => item.pricePence,
  sold: (item) => item.soldAt,
} satisfies Record<InventorySort, (item: ListedItem) => string | number | null>;

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // Titles ignore case and accents; ISO dates compare the same either way.
  return String(a).localeCompare(String(b), 'en-GB', { sensitivity: 'base' });
}

const inView = (item: ListedItem, view: InventoryView) =>
  statusesIn(view).includes(item.status) && (view !== 'toCheck' || item.toCheck.length > 0);

/**
 * The inventory list: one view, with the label and on the channel if picked,
 * matching the search, sorted (a missing value last), then newest first.
 * Runs in the app over the whole inventory, so a new query answers at once.
 */
export function listInventory<T extends ListedItem>(
  items: readonly T[],
  query: InventoryQuery,
): T[] {
  const search = query.search.trim().toLocaleLowerCase('en-GB');
  const label = query.label?.toLocaleLowerCase('en-GB') ?? null;
  const key = SORT_KEY[query.sort];
  const sign = (query.direction ?? SORT_DIRECTION[query.sort]) === 'asc' ? 1 : -1;
  return items
    .filter(
      (item) =>
        inView(item, query.view) &&
        (label === null || item.labels.some((name) => name.toLocaleLowerCase('en-GB') === label)) &&
        (query.channel === null || item.channels.includes(query.channel)) &&
        (search === '' ||
          [item.title, item.brand ?? ''].some((text) =>
            text.toLocaleLowerCase('en-GB').includes(search),
          )),
    )
    .sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      if (x === null || y === null) {
        if (x !== y) return x === null ? 1 : -1;
      } else {
        const order = sign * compareValues(x, y);
        if (order !== 0) return order;
      }
      const newest = b.createdAt.localeCompare(a.createdAt);
      return newest !== 0 ? newest : a.id.localeCompare(b.id);
    });
}

/** How many items each view holds, over the whole inventory. */
export function countInventory(items: readonly ListedItem[]): Record<InventoryView, number> {
  const counts = { available: 0, toCheck: 0, sold: 0, archived: 0, all: 0 };
  for (const item of items) {
    for (const view of INVENTORY_VIEWS) if (inView(item, view)) counts[view]++;
  }
  return counts;
}
