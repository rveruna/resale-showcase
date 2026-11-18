import {
  countInventory,
  type InventoryQuery,
  type InventoryView,
  listInventory,
} from '@resale/domain/inventory/inventoryList';
import { useLiveQuery } from '@tanstack/react-db';
import { useState } from 'react';
import { messageOf } from '../api/apiResponse';
import { type InventoryItem, itemsCollection } from './itemsCollection';

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type Inventory = {
  /** This page's rows. */
  items: InventoryItem[];
  /** `null` until the inventory has loaded. */
  total: number | null;
  counts: Record<InventoryView, number> | null;
  /** 1-based; back to 1 whenever the query changes. */
  page: number;
  pageCount: number;
  pageSize: PageSize;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  reload: () => void;
};

/**
 * The inventory list for `query`, a page at a time, from the whole inventory
 * loaded once (`itemsCollection`). Views, sorting and search run here with the
 * domain's `listInventory`, so a new query answers at once and starts on page 1.
 */
export function useInventory(query: InventoryQuery): Inventory {
  const { data, isLoading, isError } = useLiveQuery((q) => q.from({ item: itemsCollection }));
  const [paging, setPaging] = useState({ query, page: 1 });
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const matching = listInventory(data, query);
  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = paging.query === query ? Math.min(paging.page, pageCount) : 1;
  const ready = !isLoading && !isError;

  return {
    items: matching.slice((page - 1) * pageSize, page * pageSize),
    total: ready ? matching.length : null,
    counts: ready ? countInventory(data) : null,
    page,
    pageCount,
    pageSize,
    loading: isLoading,
    error: isError ? messageOf(itemsCollection.utils.lastError) : null,
    setPage: (next) => setPaging({ query, page: Math.min(Math.max(1, next), pageCount) }),
    setPageSize: (size) => {
      setPageSize(size);
      setPaging({ query, page: 1 });
    },
    // Clears the failure and loads again.
    reload: () => void itemsCollection.utils.clearError().catch(() => undefined),
  };
}
