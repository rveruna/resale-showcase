import { CATEGORY_KEYS } from '@resale/domain/item/categories';
import type { Channel } from '@resale/domain/item/channels';
import { CONDITION_KEYS } from '@resale/domain/item/condition';
import { ITEM_STATUSES } from '@resale/domain/item/status';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamp } from './columns';

/**
 * One piece of stock. `version` goes up on every write: a save sends the
 * version it loaded and is refused if it moved on (docs/architecture.md, Writes).
 */
export const items = sqliteTable(
  'items',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    description: text(),
    category: text({ enum: CATEGORY_KEYS }),
    brand: text(),
    size: text(),
    condition: text({ enum: CONDITION_KEYS }),
    pricePence: integer(),
    labels: text({ mode: 'json' }).$type<string[]>().notNull(),
    channels: text({ mode: 'json' }).$type<Channel[]>().notNull(),
    status: text({ enum: ITEM_STATUSES }).notNull(),
    soldAt: timestamp(),
    archivedAt: timestamp(),
    version: integer().notNull(),
    createdAt: timestamp().notNull(),
    updatedAt: timestamp().notNull(),
    updatedBy: text().notNull(),
  },
  (table) => [index('items_status').on(table.status)],
);

/**
 * Append-only: one row per changed field. A save's rows share a `saveId`, so the
 * history shows one block per press of Save or a status button.
 */
export const itemChanges = sqliteTable(
  'item_changes',
  {
    id: text().primaryKey(),
    itemId: text()
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    saveId: text().notNull(),
    field: text().notNull(),
    oldValue: text({ mode: 'json' }),
    newValue: text({ mode: 'json' }),
    createdAt: timestamp().notNull(),
    createdBy: text().notNull(),
  },
  (table) => [index('item_changes_item').on(table.itemId, table.createdAt)],
);
