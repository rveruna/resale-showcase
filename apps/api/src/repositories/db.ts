import type { Db } from '@resale/db/client';
import { DRIZZLE_OPTIONS } from '@resale/db/options';
import type { BatchItem } from 'drizzle-orm/batch';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

export function createD1Db(d1: D1Database): Db {
  return drizzle(d1, DRIZZLE_OPTIONS);
}

/**
 * Writes that must succeed together (docs/architecture.md, Writes): one
 * `db.batch` on D1, which runs as one transaction. The better-sqlite3 test
 * database has no batch, so there they run one after another.
 */
function canBatch(db: Db): db is Db & Pick<DrizzleD1Database, 'batch'> {
  return 'batch' in db && typeof db.batch === 'function';
}

export async function writeTogether(db: Db, statements: BatchItem<'sqlite'>[]): Promise<void> {
  const [first, ...rest] = statements;
  if (first === undefined) return;
  if (canBatch(db)) {
    await db.batch([first, ...rest]);
    return;
  }
  for (const statement of statements) await statement;
}
