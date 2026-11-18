import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import type { MakeDeps } from './deps';
import type { AppEnv } from './env';
import { errorOf, errorResponse } from './lib/errors';
import { createLogger } from './lib/log';
import { itemsRoutes } from './routes/items';

/** Stands in for the sign-in gate, which this showcase leaves out (README). */
const DEMO_USER = { id: 'demo' };

/**
 * The API. `makeDeps` is injected so tests run the real routes against the
 * SQLite test database.
 */
export function createApp(makeDeps: MakeDeps) {
  return (
    new Hono<AppEnv>()
      .use(requestId())
      .use(async (c, next) => {
        const deps = makeDeps(c.env, createLogger({ requestId: c.var.requestId }));
        const { log } = deps;
        c.set('deps', deps);
        c.set('log', log);
        c.set('user', DEMO_USER);
        const started = Date.now();
        await next();
        log.info('request', {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          ms: Date.now() - started,
          // Failures say why: every error response has the same JSON shape.
          ...(c.res.status >= 400 ? await errorOf(c.res) : {}),
        });
      })
      .onError((error, c) => {
        c.var.log.error('unhandled error', { error: String(error), stack: error.stack });
        return errorResponse(c, 500, 'INTERNAL', 'Something went wrong');
      })
      .notFound((c) => errorResponse(c, 404, 'NOT_FOUND', 'No such route'))
      // The admin web build calls from its own origin.
      .use(
        '*',
        cors({
          origin: (origin, c: Context<AppEnv>) =>
            c.var.deps.adminOrigins.includes(origin) ? origin : null,
        }),
      )
      // SLOW_MS in wrangler.jsonc: time to see a spinner or an optimistic update.
      .use(async (c, next) => {
        if (c.var.deps.slowMs > 0) await new Promise((done) => setTimeout(done, c.var.deps.slowMs));
        await next();
      })
      .route('/items', itemsRoutes)
  );
}

/** For the typed RPC client in the admin app. */
export type AppType = ReturnType<typeof createApp>;
