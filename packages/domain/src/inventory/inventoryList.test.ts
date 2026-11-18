import {
  countInventory,
  DEFAULT_QUERY,
  type InventoryQuery,
  type ListedItem,
  listInventory,
} from './inventoryList';

const item = (id: string, fields: Partial<ListedItem> = {}): ListedItem => ({
  id,
  title: `Item ${id}`,
  brand: null,
  status: 'available',
  pricePence: 1500,
  createdAt: `2026-01-${id.padStart(2, '0')}T00:00:00.000Z`,
  soldAt: null,
  labels: [],
  channels: [],
  toCheck: [],
  ...fields,
});

const ids = (items: ListedItem[]) => items.map((listed) => listed.id);
const list = (items: ListedItem[], query: Partial<InventoryQuery>) =>
  ids(listInventory(items, { ...DEFAULT_QUERY, ...query }));

describe('listInventory', () => {
  const items = [
    item('1', { title: 'Silk Blouse', brand: 'COS', labels: ['Summer'] }),
    item('2', { title: 'Wool Coat', status: 'sold', soldAt: '2026-03-01T00:00:00.000Z' }),
    item('3', { title: 'Linen Shirt', pricePence: null, toCheck: ['price'], channels: ['shop'] }),
    item('4', { title: 'Old Scarf', status: 'archived' }),
    item('5', { title: 'cotton tee', pricePence: 900, channels: ['ebay', 'vinted'] }),
  ];

  it('shows available items newest first by default', () => {
    expect(list(items, {})).toEqual(['5', '3', '1']);
  });

  it.each([
    ['toCheck', ['3']],
    ['sold', ['2']],
    ['archived', ['4']],
    ['all', ['5', '4', '3', '2', '1']],
  ] as const)('the %s view', (view, expected) => {
    expect(list(items, { view })).toEqual(expected);
  });

  it('searches titles and brands, ignoring case', () => {
    expect(list(items, { search: 'SHIRT' })).toEqual(['3']);
    expect(list(items, { search: 'cos' })).toEqual(['1']);
  });

  it('filters by label, ignoring case, and by channel', () => {
    expect(list(items, { label: 'summer' })).toEqual(['1']);
    expect(list(items, { channel: 'ebay' })).toEqual(['5']);
  });

  it('sorts titles A to Z ignoring case, and reverses on request', () => {
    expect(list(items, { sort: 'title' })).toEqual(['5', '3', '1']);
    expect(list(items, { sort: 'title', direction: 'desc' })).toEqual(['1', '3', '5']);
  });

  it('sorts dearest first, with a missing price last either way', () => {
    expect(list(items, { sort: 'price' })).toEqual(['1', '5', '3']);
    expect(list(items, { sort: 'price', direction: 'asc' })).toEqual(['5', '1', '3']);
  });
});

describe('countInventory', () => {
  it('counts every view', () => {
    expect(
      countInventory([
        item('1'),
        item('2', { toCheck: ['size'] }),
        item('3', { status: 'sold' }),
        item('4', { status: 'archived', toCheck: ['price'] }),
      ]),
    ).toEqual({ available: 2, toCheck: 1, sold: 1, archived: 1, all: 4 });
  });
});
