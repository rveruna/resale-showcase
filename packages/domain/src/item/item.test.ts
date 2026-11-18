import {
  capitaliseTitle,
  COPY_PREFIX,
  createItem,
  duplicateItem,
  editItem,
  type Item,
  missingForListing,
} from './item';

const createdAt = new Date('2026-10-01T09:00:00Z');
const complete: Item = {
  ...createItem({ id: 'i1', createdAt }),
  title: 'Silk Blouse',
  category: 'shirts',
  size: 'UK 12',
  condition: 'good',
  pricePence: 2400,
};

describe('capitaliseTitle', () => {
  it('capitalises each word and keeps capitals as typed', () => {
    expect(capitaliseTitle('ivory silk blouse by COS, UK 12')).toBe(
      'Ivory Silk Blouse By COS, UK 12',
    );
  });
});

describe('editItem', () => {
  it('applies the edit and leaves out fields as they were', () => {
    expect(editItem(complete, { pricePence: 2600 })).toEqual({
      ok: true,
      value: { ...complete, pricePence: 2600 },
    });
  });

  it('tidies what was typed: capitals, blank text, repeated labels, channel order', () => {
    const edited = editItem(complete, {
      title: '  linen shirt ',
      brand: '   ',
      labels: ['Summer', 'summer', 'linen'],
      channels: ['vinted', 'ebay', 'vinted'],
    });
    expect(edited).toMatchObject({
      ok: true,
      value: { title: 'Linen Shirt', brand: null, labels: ['Summer', 'linen'] },
    });
    expect(edited.ok && edited.value.channels).toEqual(['ebay', 'vinted']);
  });

  it('says what is wrong, by field', () => {
    expect(editItem(complete, { title: ' ', pricePence: 0 })).toEqual({
      ok: false,
      error: 'INVALID_ITEM',
      issues: [
        { path: 'title', message: 'A title is needed' },
        { path: 'pricePence', message: 'A price is more than £0' },
      ],
    });
  });

  it('refuses a size on an accessory', () => {
    expect(editItem(complete, { category: 'accessories' })).toMatchObject({
      ok: false,
      issues: [{ path: 'size', message: 'Accessories have no size' }],
    });
  });

  it('lists only an item with everything a listing needs', () => {
    expect(editItem(complete, { channels: ['shop'] }).ok).toBe(true);
    expect(editItem(complete, { channels: ['shop'], pricePence: null })).toMatchObject({
      ok: false,
      issues: [{ path: 'channels', message: 'To list it, add: price' }],
    });
  });

  it('lists only an available item', () => {
    const sold: Item = { ...complete, status: 'sold', soldAt: createdAt };
    expect(editItem(sold, { channels: ['ebay'] })).toMatchObject({
      ok: false,
      issues: [{ path: 'channels', message: 'Only an available item can be listed' }],
    });
  });
});

describe('missingForListing', () => {
  it('names each missing field', () => {
    expect(missingForListing(createItem({ id: 'n', createdAt }))).toEqual([
      'price',
      'category',
      'size',
      'condition',
    ]);
    expect(missingForListing(complete)).toEqual([]);
  });

  it('needs no size for accessories', () => {
    expect(missingForListing({ ...complete, category: 'accessories', size: null })).toEqual([]);
  });
});

describe('duplicateItem', () => {
  it('copies the details as a new, unlisted, available item', () => {
    const sold: Item = { ...complete, status: 'sold', soldAt: createdAt, channels: [] };
    const later = new Date('2026-11-01T09:00:00Z');
    expect(duplicateItem(sold, { id: 'i2', createdAt: later })).toEqual({
      ok: true,
      value: {
        ...complete,
        id: 'i2',
        createdAt: later,
        title: `${COPY_PREFIX}Silk Blouse`,
      },
    });
  });
});
