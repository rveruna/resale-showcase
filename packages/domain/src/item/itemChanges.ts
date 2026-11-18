import type { Item } from './item';

/**
 * One row of an item's change history (`item_changes`): the field and its
 * value before and after, as JSON.
 */
export type FieldChange = { field: TrackedField; oldValue: unknown; newValue: unknown };

/** Every field but the id and creation date, which never change. */
const TRACKED = [
  'title',
  'description',
  'category',
  'brand',
  'size',
  'condition',
  'pricePence',
  'labels',
  'channels',
  'status',
  'soldAt',
  'archivedAt',
] as const satisfies readonly (keyof Item)[];

export type TrackedField = (typeof TRACKED)[number];

/** Dates as ISO strings, so the history stores and compares plain JSON. */
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value ?? null));

/** What an edit or status button changed, field by field; empty if nothing did. */
export function itemChanges(before: Item, after: Item): FieldChange[] {
  return TRACKED.flatMap((field) => {
    const oldValue = asJson(before[field]);
    const newValue = asJson(after[field]);
    return JSON.stringify(oldValue) === JSON.stringify(newValue)
      ? []
      : [{ field, oldValue, newValue }];
  });
}
