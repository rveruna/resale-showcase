import type { ItemDetail } from './itemQueries';

const item = {
  id: 'i1',
  title: 'COS Ivory Silk Blouse',
  description: 'Mother-of-pearl buttons, French seams.',
  category: 'shirts',
  brand: 'COS',
  size: 'UK 12',
  condition: 'good',
  pricePence: 2450,
  labels: ['summer'],
  channels: ['ebay'],
  status: 'available',
  soldAt: null,
  archivedAt: null,
  createdAt: '2026-10-01T09:00:00.000Z',
} satisfies ItemDetail['item'];

/** `GET /items/:id` as the API sends it, for stories and tests. */
export function itemDetail(
  fields: Partial<ItemDetail['item']> = {},
  rest: Partial<Omit<ItemDetail, 'item' | 'summary'>> = {},
): ItemDetail {
  const merged = { ...item, ...fields };
  const version = rest.version ?? 1;
  return {
    item: merged,
    version,
    updatedAt: '2026-10-01T09:00:00.000Z',
    toCheck: [],
    statusActions: ['markSold', 'archive'],
    ...rest,
    summary: {
      id: merged.id,
      title: merged.title,
      brand: merged.brand,
      category: merged.category,
      size: merged.size,
      status: merged.status,
      pricePence: merged.pricePence,
      labels: merged.labels,
      channels: merged.channels,
      createdAt: merged.createdAt,
      soldAt: merged.soldAt,
      toCheck: rest.toCheck ?? [],
      version,
    },
  };
}
