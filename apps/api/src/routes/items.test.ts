import { createTestDb, type TestDb } from '@resale/db/testing/testDb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import type { Logger } from '../lib/log';
import { itemsRepository } from '../repositories/itemsRepository';
import { seedItem } from '../testing/seed';

type ErrorBody = { error: { code: string; message: string; itemId?: string } };

const silentLog: Logger = { info: vi.fn(), error: vi.fn() };
let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  db = createTestDb();
  app = createApp(() => ({
    items: itemsRepository(db),
    log: silentLog,
    adminOrigins: [],
    slowMs: 0,
  }));
  await seedItem(db, 'blouse', { title: 'Silk Blouse', brand: 'COS', labels: ['summer'] });
  await seedItem(db, 'shirt', {
    title: 'Linen Shirt',
    pricePence: null,
    createdAt: new Date('2026-10-02T09:00:00Z'),
  });
});

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('GET /items', () => {
  it('sends the whole inventory as list rows, newest first', async () => {
    const response = await app.request('/items');
    expect(response.status).toBe(200);
    const { items } = (await response.json()) as { items: { id: string }[] };
    expect(items.map((row) => row.id)).toEqual(['shirt', 'blouse']);
    expect(items[0]).toMatchObject({ title: 'Linen Shirt', toCheck: ['price'], version: 1 });
  });
});

describe('GET /items/:id', () => {
  it('sends the item with its version and the buttons that apply', async () => {
    const response = await app.request('/items/blouse');
    expect(await response.json()).toMatchObject({
      item: { id: 'blouse', title: 'Silk Blouse', status: 'available' },
      version: 1,
      toCheck: [],
      statusActions: ['markSold', 'archive'],
    });
  });

  it('says when there is no such item, in the one error shape', async () => {
    const response = await app.request('/items/nope');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'ITEM_NOT_FOUND', message: 'This item no longer exists' },
    });
  });
});

describe('PATCH /items/:id', () => {
  it('saves, moves the version on and records the history', async () => {
    const response = await app.request(
      '/items/blouse',
      json('PATCH', { version: 1, set: { pricePence: 2600, channels: ['ebay'] } }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      version: 2,
      item: { pricePence: 2600, channels: ['ebay'] },
    });
    const history = (await (await app.request('/items/blouse/changes')).json()) as {
      changes: { saveId: string }[];
    };
    expect(history.changes).toMatchObject([
      { field: 'pricePence', oldValue: 2400, newValue: 2600, createdBy: 'demo' },
      { field: 'channels', oldValue: [], newValue: ['ebay'] },
    ]);
    expect(history.changes[0]?.saveId).toBe(history.changes[1]?.saveId);
  });

  it('refuses a save on a version that moved on, and writes nothing', async () => {
    await app.request('/items/blouse', json('PATCH', { version: 1, set: { title: 'First' } }));
    const response = await app.request(
      '/items/blouse',
      json('PATCH', { version: 1, set: { title: 'Second' } }),
    );
    expect(response.status).toBe(409);
    expect(((await response.json()) as ErrorBody).error.code).toBe('VERSION_CONFLICT');
    const after = await (await app.request('/items/blouse')).json();
    expect(after).toMatchObject({ version: 2, item: { title: 'First' } });
  });

  it('refuses what the domain rules refuse, by field', async () => {
    const response = await app.request(
      '/items/shirt',
      json('PATCH', { version: 1, set: { channels: ['shop'] } }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'INVALID_ITEM', message: 'channels: To list it, add: price' },
    });
  });

  it('refuses a malformed body with the same shape', async () => {
    const response = await app.request('/items/blouse', json('PATCH', { set: {} }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe('VALIDATION_FAILED');
  });

  it('keeps the version when nothing changed', async () => {
    const response = await app.request(
      '/items/blouse',
      json('PATCH', { version: 1, set: { title: 'silk blouse' } }),
    );
    expect(await response.json()).toMatchObject({ version: 1 });
  });
});

describe('POST /items', () => {
  it('creates an item from the form', async () => {
    const response = await app.request(
      '/items',
      json('POST', { set: { title: 'wool coat', pricePence: 4500 } }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      version: 1,
      item: { title: 'Wool Coat', pricePence: 4500, status: 'available' },
      toCheck: ['category', 'size', 'condition'],
    });
  });

  it('needs a title', async () => {
    const response = await app.request('/items', json('POST', { set: {} }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'INVALID_ITEM', message: 'title: A title is needed' },
    });
  });
});

describe('status changes', () => {
  it('marks one item sold, which ends its listings', async () => {
    await app.request('/items/blouse', json('PATCH', { version: 1, set: { channels: ['ebay'] } }));
    const response = await app.request(
      '/items/blouse/status',
      json('POST', { version: 2, action: 'markSold' }),
    );
    expect(await response.json()).toMatchObject({
      version: 3,
      item: { status: 'sold', channels: [] },
      statusActions: ['receiveReturn', 'archive'],
    });
  });

  it('archives every ticked item, or none if one is refused', async () => {
    await app.request('/items/shirt/status', json('POST', { version: 1, action: 'archive' }));
    const refused = await app.request(
      '/items/status',
      json('POST', {
        action: 'archive',
        items: [
          { id: 'blouse', version: 1 },
          { id: 'shirt', version: 2 },
        ],
      }),
    );
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({
      error: {
        code: 'ITEM_ALREADY_ARCHIVED',
        message: 'This item is already archived',
        itemId: 'shirt',
      },
    });
    expect(await (await app.request('/items/blouse')).json()).toMatchObject({
      item: { status: 'available' },
    });

    const archived = await app.request(
      '/items/status',
      json('POST', { action: 'unarchive', items: [{ id: 'shirt', version: 2 }] }),
    );
    expect(await archived.json()).toMatchObject({
      items: [{ id: 'shirt', status: 'available', version: 3 }],
    });
  });
});

describe('copy and delete', () => {
  it('copies an item as a new one', async () => {
    const response = await app.request('/items/blouse/duplicate', { method: 'POST' });
    expect(response.status).toBe(201);
    const copy = (await response.json()) as { item: { id: string } };
    expect(copy.item).toMatchObject({ title: 'Copy Of Silk Blouse', brand: 'COS' });
    expect(copy.item.id).not.toBe('blouse');
  });

  it('deletes an item with its history', async () => {
    await app.request('/items/blouse', json('PATCH', { version: 1, set: { pricePence: 1 } }));
    expect((await app.request('/items/blouse', { method: 'DELETE' })).status).toBe(204);
    expect((await app.request('/items/blouse')).status).toBe(404);
    expect(await (await app.request('/items/blouse/changes')).json()).toEqual({ changes: [] });
  });
});

describe('GET /items/choices', () => {
  it('sends the brands and labels in use', async () => {
    expect(await (await app.request('/items/choices')).json()).toEqual({
      brands: ['COS'],
      labels: ['summer'],
    });
  });
});
