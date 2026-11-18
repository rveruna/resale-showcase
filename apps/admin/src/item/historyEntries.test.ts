import { historyEntries } from './historyEntries';
import type { ItemChanges } from './itemQueries';

type Value = ItemChanges[number]['oldValue'];

const change = (saveId: string, field: string, oldValue: Value, newValue: Value) => ({
  id: `${saveId}-${field}`,
  saveId,
  field,
  oldValue,
  newValue,
  createdAt: saveId === 'b' ? '2026-11-02T10:00:00.000Z' : '2026-11-01T10:00:00.000Z',
  createdBy: 'demo',
});

describe('historyEntries', () => {
  it('groups one save into one entry and says each value as the form would', () => {
    expect(
      historyEntries([
        change('b', 'status', 'available', 'sold'),
        change('b', 'soldAt', null, '2026-11-02T10:00:00.000Z'),
        change('b', 'channels', ['ebay', 'vinted'], []),
        change('a', 'pricePence', 2400, 2450),
        change('a', 'category', null, 'shirts'),
      ]),
    ).toEqual([
      {
        id: 'b',
        at: '2026-11-02T10:00:00.000Z',
        by: 'demo',
        lines: [
          { field: 'Status', from: 'Available', to: 'Sold' },
          { field: 'Sold', from: '—', to: '2 Nov 2026' },
          { field: 'Listed on', from: 'eBay, Vinted', to: '—' },
        ],
      },
      {
        id: 'a',
        at: '2026-11-01T10:00:00.000Z',
        by: 'demo',
        lines: [
          { field: 'Price', from: '£24.00', to: '£24.50' },
          { field: 'Category', from: '—', to: 'Shirts & blouses' },
        ],
      },
    ]);
  });
});
