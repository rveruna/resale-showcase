import {
  createItem,
  duplicateItem,
  editItem,
  type ItemEdit,
  type ValidationIssue,
} from '@resale/domain/item/item';
import { itemChanges } from '@resale/domain/item/itemChanges';
import { applyStatusAction, type StatusAction, type StatusError } from '@resale/domain/item/status';
import { fail, ok, type Result } from '@resale/domain/result';
import type { Deps } from '../deps';
import { newId } from '../lib/ids';
import type { ItemChange, ItemSave, StoredItem, Writer } from '../repositories/itemsRepository';
import { detailOf, type ItemDetail, type ItemSummary, summaryOf } from './itemViews';

type ItemDeps = Pick<Deps, 'items'>;

export type SaveError = 'ITEM_NOT_FOUND' | 'VERSION_CONFLICT';

type Invalid = { ok: false; error: 'INVALID_ITEM'; issues: ValidationIssue[] };

/** The whole inventory: the app loads it once and filters, sorts and searches on the phone. */
export async function listItems(deps: ItemDeps): Promise<{ items: ItemSummary[] }> {
  return { items: (await deps.items.list()).map(summaryOf) };
}

export async function getItem(
  deps: ItemDeps,
  id: string,
): Promise<Result<ItemDetail, 'ITEM_NOT_FOUND'>> {
  const stored = await deps.items.get(id);
  return stored === undefined ? fail('ITEM_NOT_FOUND') : ok(detailOf(stored));
}

export async function itemChoices(deps: ItemDeps) {
  return deps.items.choices();
}

/** The item's history, newest first. */
export async function itemHistory(deps: ItemDeps, id: string): Promise<{ changes: ItemChange[] }> {
  return { changes: await deps.items.changes(id) };
}

const idAt = (by: Writer) => () => newId(by.now.getTime());

/** Saves what changed, if anything; nothing changed writes nothing and keeps the version. */
async function write(
  deps: ItemDeps,
  updates: { stored: StoredItem; after: ItemSave['after'] }[],
  by: Writer,
): Promise<Result<StoredItem[], SaveError>> {
  const saves = updates.flatMap(({ stored, after }) => {
    const changes = itemChanges(stored.item, after);
    return changes.length === 0 ? [] : [{ after, version: stored.version, changes }];
  });
  if (saves.length > 0) {
    const outcome = await deps.items.saveAll(saves, by, idAt(by));
    if (outcome === 'NOT_FOUND') return fail('ITEM_NOT_FOUND');
    if (outcome === 'VERSION_CONFLICT') return fail('VERSION_CONFLICT');
  }
  return ok(await deps.items.getMany(updates.map(({ stored }) => stored.item.id)));
}

/** Loads the item for a write, if it's still at the version she loaded. */
async function load(
  deps: ItemDeps,
  id: string,
  version: number,
): Promise<Result<StoredItem, SaveError>> {
  const stored = await deps.items.get(id);
  if (stored === undefined) return fail('ITEM_NOT_FOUND');
  if (stored.version !== version) return fail('VERSION_CONFLICT');
  return ok(stored);
}

const detailAfter = async (deps: ItemDeps, written: Result<StoredItem[], SaveError>) =>
  written.ok ? getItem(deps, written.value[0]?.item.id ?? '') : written;

/** An edit from the item screen, checked by the domain's rules. */
export async function saveItemEdit(
  deps: ItemDeps,
  id: string,
  { version, set }: { version: number; set: ItemEdit },
  by: Writer,
): Promise<Result<ItemDetail, SaveError> | Invalid> {
  const loaded = await load(deps, id, version);
  if (!loaded.ok) return loaded;
  const edited = editItem(loaded.value.item, set);
  if (!edited.ok) return edited;
  return detailAfter(deps, await write(deps, [{ stored: loaded.value, after: edited.value }], by));
}

/** New item: the form's first Save, checked by the same rules as any save. */
export async function createNewItem(
  deps: ItemDeps,
  { set }: { set: ItemEdit },
  by: Writer,
): Promise<Result<ItemDetail, 'ITEM_NOT_FOUND'> | Invalid> {
  const created = editItem(createItem({ id: idAt(by)(), createdAt: by.now }), set);
  if (!created.ok) return created;
  await deps.items.insert(created.value, by);
  return getItem(deps, created.value.id);
}

/** A copy to list a similar piece. */
export async function copyItem(
  deps: ItemDeps,
  id: string,
  by: Writer,
): Promise<Result<ItemDetail, 'ITEM_NOT_FOUND'>> {
  const stored = await deps.items.get(id);
  if (stored === undefined) return fail('ITEM_NOT_FOUND');
  const copy = duplicateItem(stored.item, { id: idAt(by)(), createdAt: by.now });
  if (!copy.ok) throw new Error(`A copy of ${id} broke the item rules`);
  await deps.items.insert(copy.value, by);
  return getItem(deps, copy.value.id);
}

export type StatusOutcome = Result<ItemDetail, SaveError | StatusError>;

/** One status button on the item screen. */
export async function changeItemStatus(
  deps: ItemDeps,
  id: string,
  { version, action }: { version: number; action: StatusAction },
  by: Writer,
): Promise<StatusOutcome> {
  const loaded = await load(deps, id, version);
  if (!loaded.ok) return loaded;
  const changed = applyStatusAction(loaded.value.item, action, by.now);
  if (!changed.ok) return changed;
  return detailAfter(deps, await write(deps, [{ stored: loaded.value, after: changed.value }], by));
}

/** Which item a bulk change stopped at, and why. */
export type BulkRefusal = { ok: false; error: SaveError | StatusError; itemId: string };

/**
 * One status button for every ticked item in the list: all change or none
 * do, so a refusal never leaves the list half done.
 */
export async function changeStatuses(
  deps: ItemDeps,
  { action, items }: { action: StatusAction; items: { id: string; version: number }[] },
  by: Writer,
): Promise<{ ok: true; value: { items: ItemSummary[] } } | BulkRefusal> {
  const updates: { stored: StoredItem; after: StoredItem['item'] }[] = [];
  for (const { id, version } of items) {
    const loaded = await load(deps, id, version);
    if (!loaded.ok) return { ...loaded, itemId: id };
    const changed = applyStatusAction(loaded.value.item, action, by.now);
    if (!changed.ok) return { ...changed, itemId: id };
    updates.push({ stored: loaded.value, after: changed.value });
  }
  const written = await write(deps, updates, by);
  if (!written.ok) return { ...written, itemId: items[0]?.id ?? '' };
  return ok({ items: written.value.map(summaryOf) });
}

export async function deleteItem(
  deps: ItemDeps,
  id: string,
): Promise<Result<null, 'ITEM_NOT_FOUND'>> {
  return (await deps.items.delete(id)) ? ok(null) : fail('ITEM_NOT_FOUND');
}
