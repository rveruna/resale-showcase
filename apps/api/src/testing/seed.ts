import { createItem, type Item } from '@resale/domain/item/item';
import type { TestDb } from '@resale/db/testing/testDb';
import { itemsRepository } from '../repositories/itemsRepository';

/** A complete, available item, ready to list, unless `fields` say otherwise. */
export function testItem(id: string, fields: Partial<Item> = {}): Item {
  return {
    ...createItem({ id, createdAt: new Date('2026-10-01T09:00:00Z') }),
    title: `Item ${id}`,
    category: 'shirts',
    size: 'UK 12',
    condition: 'good',
    pricePence: 2400,
    ...fields,
  };
}

export async function seedItem(db: TestDb, id: string, fields: Partial<Item> = {}) {
  const item = testItem(id, fields);
  await itemsRepository(db).insert(item, { userId: 'demo', now: item.createdAt });
  return item;
}
