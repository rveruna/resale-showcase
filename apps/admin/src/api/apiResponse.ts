import { type ClientResponse, parseResponse } from 'hono/client';
import { z } from 'zod';

const errorBody = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

/** A failed API call, with the `{ error: { code, message } }` the API always sends. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const detailedError = z.object({
  statusCode: z.number(),
  detail: z.object({ data: z.unknown() }),
});

/** Hono's `DetailedError` for a non-2xx answer, as the app's `ApiError`. */
function apiErrorOf(error: unknown): ApiError {
  const failed = detailedError.safeParse(error);
  if (!failed.success) return new ApiError(0, 'UNKNOWN', 'The server sent something unreadable');
  const { statusCode, detail } = failed.data;
  const body = errorBody.safeParse(detail.data);
  return body.success
    ? new ApiError(statusCode, body.data.error.code, body.data.error.message)
    : new ApiError(statusCode, 'UNKNOWN', `The server answered ${statusCode}`);
}

/**
 * The body of a successful call, typed from the API's route, e.g.
 * `await unwrap(api.items.$get())`. Any failure becomes an `ApiError`.
 */
export async function unwrap<T extends ClientResponse<unknown>>(call: Promise<T>) {
  let response: T;
  try {
    response = await call;
  } catch {
    throw new ApiError(0, 'NETWORK', 'No connection to the server');
  }
  try {
    return await parseResponse(response);
  } catch (error) {
    throw apiErrorOf(error);
  }
}

/** What to tell the user about a failure. */
export const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong';
