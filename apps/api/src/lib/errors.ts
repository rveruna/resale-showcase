import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * The one error shape every route returns (docs/architecture.md, Backend).
 * Expected failures carry a code the app can switch on, e.g. `VERSION_CONFLICT`.
 */
export type ErrorBody = { error: { code: string; message: string } };

export function errorResponse<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: string,
  message: string,
) {
  const body: ErrorBody = { error: { code, message } };
  return c.json(body, status);
}

/** The `{ code, message }` of an error response, for the request log. */
export async function errorOf(response: Response): Promise<{ error: unknown }> {
  try {
    const body: unknown = await response.clone().json();
    return {
      error: typeof body === 'object' && body !== null && 'error' in body ? body.error : body,
    };
  } catch {
    return { error: 'response body is not JSON' };
  }
}
