import { createItem } from './item';
import { itemChanges } from './itemChanges';

const before = {
  ...createItem({ id: 'i1', createdAt: new Date('2026-10-01T09:00:00Z') }),
  title: 'Silk Blouse',
  labels: ['summer'],
};

describe('itemChanges', () => {
  it('is empty when nothing changed', () => {
    expect(itemChanges(before, { ...before, labels: ['summer'] })).toEqual([]);
  });

  it('has one row per changed field, dates as ISO strings', () => {
    const soldAt = new Date('2026-11-02T12:00:00Z');
    expect(itemChanges(before, { ...before, pricePence: 2400, status: 'sold', soldAt })).toEqual([
      { field: 'pricePence', oldValue: null, newValue: 2400 },
      { field: 'status', oldValue: 'available', newValue: 'sold' },
      { field: 'soldAt', oldValue: null, newValue: '2026-11-02T12:00:00.000Z' },
    ]);
  });
});
