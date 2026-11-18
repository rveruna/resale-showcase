import { zValidator } from '@hono/zod-validator';
import { itemEditSchema, type ValidationIssue } from '@resale/domain/item/item';
import { STATUS_ACTIONS } from '@resale/domain/item/status';
import { type Context, Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { errorResponse } from '../lib/errors';
import { validationFailed } from '../lib/validation';
import {
  changeItemStatus,
  changeStatuses,
  copyItem,
  createNewItem,
  deleteItem,
  getItem,
  itemChoices,
  itemHistory,
  listItems,
  saveItemEdit,
} from '../services/items';

const version = z.number().int().min(1);
const editBody = z.object({ version, set: itemEditSchema });
const createBody = z.object({ set: itemEditSchema });
const statusBody = z.object({ version, action: z.enum(STATUS_ACTIONS) });
const bulkStatusBody = z.object({
  action: z.enum(STATUS_ACTIONS),
  items: z
    .array(z.object({ id: z.string().min(1), version }))
    .min(1)
    .max(100),
});

/** Why a write was refused, for the app to say (docs/architecture.md, Errors). */
const REFUSALS = {
  ITEM_NOT_FOUND: [404, 'This item no longer exists'],
  VERSION_CONFLICT: [409, 'This item changed since you opened it. Reload it and try again'],
  ITEM_NOT_AVAILABLE: [409, 'Only an available item can be marked sold'],
  ITEM_NOT_SOLD: [409, 'Only a sold item can come back as a return'],
  ITEM_ALREADY_ARCHIVED: [409, 'This item is already archived'],
  ITEM_NOT_ARCHIVED: [409, "This item isn't archived"],
} as const;

const refused = (c: Context, error: keyof typeof REFUSALS) =>
  errorResponse(c, REFUSALS[error][0], error, REFUSALS[error][1]);

/** An item the domain's rules refuse, each reason with its field. */
const invalidItem = (c: Context, issues: ValidationIssue[]) =>
  errorResponse(
    c,
    400,
    'INVALID_ITEM',
    issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '),
  );

/** Who and when, for every write. */
const writer = (c: Context<AppEnv>) => ({ userId: c.var.user.id, now: new Date() });

/**
 * HTTP only: validate, call one service, map its result
 * (docs/architecture.md, Backend layers).
 */
export const itemsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await listItems(c.var.deps)))
  .post('/', zValidator('json', createBody, validationFailed), async (c) => {
    const result = await createNewItem(c.var.deps, c.req.valid('json'), writer(c));
    if (result.ok) return c.json(result.value, 201);
    if (result.error === 'INVALID_ITEM') return invalidItem(c, result.issues);
    return refused(c, result.error);
  })
  .get('/choices', async (c) => c.json(await itemChoices(c.var.deps)))
  .post('/status', zValidator('json', bulkStatusBody, validationFailed), async (c) => {
    const result = await changeStatuses(c.var.deps, c.req.valid('json'), writer(c));
    if (result.ok) return c.json(result.value);
    const [status, message] = REFUSALS[result.error];
    return c.json({ error: { code: result.error, message, itemId: result.itemId } }, status);
  })
  .get('/:id', async (c) => {
    const result = await getItem(c.var.deps, c.req.param('id'));
    if (!result.ok) return refused(c, result.error);
    return c.json(result.value);
  })
  .get('/:id/changes', async (c) => c.json(await itemHistory(c.var.deps, c.req.param('id'))))
  .patch('/:id', zValidator('json', editBody, validationFailed), async (c) => {
    const result = await saveItemEdit(
      c.var.deps,
      c.req.param('id'),
      c.req.valid('json'),
      writer(c),
    );
    if (result.ok) return c.json(result.value);
    if (result.error === 'INVALID_ITEM') return invalidItem(c, result.issues);
    return refused(c, result.error);
  })
  .post('/:id/status', zValidator('json', statusBody, validationFailed), async (c) => {
    const result = await changeItemStatus(
      c.var.deps,
      c.req.param('id'),
      c.req.valid('json'),
      writer(c),
    );
    if (result.ok) return c.json(result.value);
    return refused(c, result.error);
  })
  .post('/:id/duplicate', async (c) => {
    const result = await copyItem(c.var.deps, c.req.param('id'), writer(c));
    if (!result.ok) return refused(c, result.error);
    return c.json(result.value, 201);
  })
  .delete('/:id', async (c) => {
    const result = await deleteItem(c.var.deps, c.req.param('id'));
    if (!result.ok) return refused(c, result.error);
    return c.body(null, 204);
  });
