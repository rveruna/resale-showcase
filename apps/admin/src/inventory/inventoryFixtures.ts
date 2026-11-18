import type { InventoryItem } from './itemsCollection';

/** A list row as the API sends it, for stories and tests. */
export const inventoryItem = (id: string, fields: Partial<InventoryItem> = {}): InventoryItem => ({
  id,
  title: `Item ${id}`,
  brand: null,
  category: 'shirts',
  size: 'UK 12',
  status: 'available',
  pricePence: 1500,
  labels: [],
  channels: [],
  createdAt: `2026-01-${id.padStart(2, '0')}T00:00:00.000Z`,
  soldAt: null,
  toCheck: [],
  version: 1,
  ...fields,
});
