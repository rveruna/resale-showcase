import type { Db } from '@resale/db/client';
import { itemChanges, items } from '@resale/db/schema/inventory';
import type { Item } from '@resale/domain/item/item';
import type { FieldChange } from '@resale/domain/item/itemChanges';
import { asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { writeTogether } from './db';

/** Who's writing, and when: every write records both. */
export type Writer = { userId: string; now: Date };

/** An item as stored: the domain's item plus the version a save must send back. */
export type StoredItem = { item: Item; version: number; updatedAt: Date };

/** One row of the history, as the history screen reads it. */
export type ItemChange = {
  id: string;
  saveId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
  createdBy: string;
};

/** One save: the item before and after, the version she loaded, and what changed. */
export type ItemSave = { after: Item; version: number; changes: FieldChange[] };

export type SaveOutcome = 'SAVED' | 'NOT_FOUND' | 'VERSION_CONFLICT';

export type ItemsRepository = {
  list(): Promise<StoredItem[]>;
  get(id: string): Promise<StoredItem | undefined>;
  getMany(ids: string[]): Promise<StoredItem[]>;
  insert(item: Item, by: Writer): Promise<void>;
  /**
   * Saves every one or none: one that's gone or has moved past the version she
   * loaded refuses the lot (the first such one's outcome is returned).
   */
  saveAll(saves: ItemSave[], by: Writer, newId: () => string): Promise<SaveOutcome>;
  delete(id: string): Promise<boolean>;
  changes(id: string): Promise<ItemChange[]>;
  /** Every brand and label in use, for the form's suggestions. */
  choices(): Promise<{ brands: string[]; labels: string[] }>;
};

type ItemRow = typeof items.$inferSelect;

const storedOf = ({ version, updatedAt, updatedBy: _, ...item }: ItemRow): StoredItem => ({
  item,
  version,
  updatedAt,
});

export function itemsRepository(db: Db): ItemsRepository {
  async function versionsOf(ids: string[]) {
    const rows = await db
      .select({ id: items.id, version: items.version })
      .from(items)
      .where(inArray(items.id, ids));
    return new Map(rows.map((row) => [row.id, row.version]));
  }

  function saveStatements({ after, version, changes }: ItemSave, by: Writer, newId: () => string) {
    const saveId = newId();
    const statements: BatchItem<'sqlite'>[] = [
      // First, so nothing else is written on a stale version: a version that moved on
      // sets NULL, which NOT NULL refuses, and D1 rolls the whole batch back.
      db
        .update(items)
        .set({
          ...after,
          version: sql`case when ${items.version} = ${version} then ${items.version} + 1 end`,
          updatedAt: by.now,
          updatedBy: by.userId,
        })
        .where(eq(items.id, after.id)),
      ...changes.map((change) =>
        db.insert(itemChanges).values({
          id: newId(),
          itemId: after.id,
          saveId,
          ...change,
          createdAt: by.now,
          createdBy: by.userId,
        }),
      ),
    ];
    return statements;
  }

  return {
    list: async () => (await db.select().from(items).orderBy(desc(items.createdAt))).map(storedOf),

    get: async (id) => {
      const [row] = await db.select().from(items).where(eq(items.id, id));
      return row === undefined ? undefined : storedOf(row);
    },

    getMany: async (ids) =>
      ids.length === 0
        ? []
        : (await db.select().from(items).where(inArray(items.id, ids))).map(storedOf),

    insert: async (item, by) => {
      await db
        .insert(items)
        .values({ ...item, version: 1, updatedAt: by.now, updatedBy: by.userId });
    },

    saveAll: async (saves, by, newId) => {
      // Checked first so the usual refusal costs no failed write; the write's own
      // check below still catches a save that lands in between.
      const ids = saves.map((save) => save.after.id);
      const before = await versionsOf(ids);
      for (const save of saves) {
        const current = before.get(save.after.id);
        if (current === undefined) return 'NOT_FOUND';
        if (current !== save.version) return 'VERSION_CONFLICT';
      }
      try {
        await writeTogether(
          db,
          saves.flatMap((save) => saveStatements(save, by, newId)),
        );
        return 'SAVED';
      } catch (error) {
        const after = await versionsOf(ids);
        for (const save of saves) {
          if (!after.has(save.after.id)) return 'NOT_FOUND';
          if (after.get(save.after.id) !== save.version + 1) return 'VERSION_CONFLICT';
        }
        throw error;
      }
    },

    delete: async (id) => {
      const removed = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
      return removed.length > 0;
    },

    changes: async (id) =>
      db
        .select({
          id: itemChanges.id,
          saveId: itemChanges.saveId,
          field: itemChanges.field,
          oldValue: itemChanges.oldValue,
          newValue: itemChanges.newValue,
          createdAt: itemChanges.createdAt,
          createdBy: itemChanges.createdBy,
        })
        .from(itemChanges)
        .where(eq(itemChanges.itemId, id))
        // Newest save first; within a save, the fields in the order they were written.
        .orderBy(desc(itemChanges.createdAt), asc(sql`rowid`)),

    choices: async () => {
      const brands = await db
        .selectDistinct({ brand: items.brand })
        .from(items)
        .where(isNotNull(items.brand))
        .orderBy(asc(items.brand));
      const labels = await db
        .select({ label: sql<string>`distinct json_each.value` })
        .from(sql`${items}, json_each(${items.labels})`)
        .orderBy(sql`lower(json_each.value)`);
      return {
        brands: brands.flatMap(({ brand }) => (brand === null ? [] : [brand])),
        labels: labels.map(({ label }) => label),
      };
    },
  };
}
