import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

/**
 * What repositories accept: D1 in the Worker, or the better-sqlite3 test
 * database. Repositories `await` every query, which works on both.
 */
export type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;
