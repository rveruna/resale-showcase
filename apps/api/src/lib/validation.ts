import type { Context } from 'hono';
import { errorResponse } from './errors';

type ValidationResult =
  { success: true } | { success: false; error: { issues: readonly { message: string }[] } };

/** zValidator hook: a bad query or body gets the standard error shape, not Hono's default. */
export function validationFailed(result: ValidationResult, c: Context) {
  if (result.success) return undefined;
  const message = result.error.issues.map((issue) => issue.message).join('; ');
  return errorResponse(c, 400, 'VALIDATION_FAILED', message);
}
