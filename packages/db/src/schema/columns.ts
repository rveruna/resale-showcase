import { integer } from 'drizzle-orm/sqlite-core';

/** UTC milliseconds, read back as a Date (docs/architecture.md, Data). */
export function timestamp() {
  return integer({ mode: 'timestamp_ms' });
}
