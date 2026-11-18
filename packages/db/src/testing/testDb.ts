import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DRIZZLE_OPTIONS } from '../options';

const MIGRATIONS = path.join(__dirname, '../../migrations');

/**
 * A fresh in-memory SQLite database built from the real migrations, for API
 * tests (docs/architecture.md, Testing). Foreign keys are on, as in D1.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite, ...DRIZZLE_OPTIONS });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

export type TestDb = ReturnType<typeof createTestDb>;
