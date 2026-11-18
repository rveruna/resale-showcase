import { createItem } from '@resale/domain/item/item';
import { checkForm, formOf, itemOf } from './itemForm';

const item = {
  ...createItem({ id: 'i1', createdAt: new Date('2026-10-01T09:00:00Z') }),
  title: 'Silk Blouse',
  category: 'shirts' as const,
  size: 'UK 12',
  condition: 'good' as const,
  pricePence: 2450,
};

describe('the item form', () => {
  it('shows the saved item, price in pounds and blanks as empty text', () => {
    expect(formOf(item)).toEqual({
      title: 'Silk Blouse',
      description: '',
      category: 'shirts',
      brand: '',
      size: 'UK 12',
      condition: 'good',
      price: '24.50',
      labels: [],
      channels: [],
    });
  });

  it('reads the API JSON back as the domain item', () => {
    const json = JSON.parse(JSON.stringify({ item }));
    expect(itemOf(json)).toEqual(item);
  });

  it('turns the form into an edit, price in pence', () => {
    expect(checkForm({ ...formOf(item), price: '30', brand: 'COS' }, item)).toEqual({
      ok: true,
      set: expect.objectContaining({ pricePence: 3000, brand: 'COS', title: 'Silk Blouse' }),
    });
  });

  it('says what is wrong under the field it belongs to', () => {
    expect(checkForm({ ...formOf(item), price: 'abc' }, item)).toEqual({
      ok: false,
      issues: { price: 'Type a price like 24 or 24.50' },
    });
    expect(checkForm({ ...formOf(item), title: '', price: '', channels: ['ebay'] }, item)).toEqual({
      ok: false,
      issues: { title: 'A title is needed', channels: 'To list it, add: price' },
    });
  });
});
