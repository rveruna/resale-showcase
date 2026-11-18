import type { Bindings } from './env';
import type { Logger } from './lib/log';
import { createD1Db } from './repositories/db';
import { type ItemsRepository, itemsRepository } from './repositories/itemsRepository';

/**
 * Everything services reach the outside through, built fresh per request
 * (docs/architecture.md, Backend). Tests build their own on the SQLite test database.
 */
export type Deps = {
  items: ItemsRepository;
  log: Logger;
  adminOrigins: string[];
  slowMs: number;
};

export type MakeDeps = (env: Bindings, log: Logger) => Deps;

export const makeDeps: MakeDeps = (env, log) => ({
  items: itemsRepository(createD1Db(env.DB)),
  log,
  adminOrigins: env.ADMIN_ORIGINS.split(',').filter((origin) => origin !== ''),
  slowMs: Number(env.SLOW_MS),
});
