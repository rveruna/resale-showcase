/**
 * Outcome of a rule that can fail in an expected way, e.g. archiving an item
 * that's already archived (docs/backend-architecture.md, errors). Exceptions
 * are for bugs and outages only.
 */
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
