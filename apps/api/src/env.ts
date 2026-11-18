import type { Deps } from './deps';
import type { Logger } from './lib/log';

/** Bindings from wrangler.jsonc. */
export type Bindings = {
  DB: D1Database;
  /** Comma-separated origins of the admin web build. */
  ADMIN_ORIGINS: string;
  /** Milliseconds to hold every response, for watching loading states; "0" for none. */
  SLOW_MS: string;
};

/** Whoever made the request; a fixed demo user here (README: what's left out). */
export type CurrentUser = { id: string };

/** Hono's environment: bindings plus what middleware sets on each request. */
export type AppEnv = {
  Bindings: Bindings;
  Variables: { requestId: string; log: Logger; deps: Deps; user: CurrentUser };
};
