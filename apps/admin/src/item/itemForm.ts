import type { Category } from '@resale/domain/item/categories';
import type { Channel } from '@resale/domain/item/channels';
import type { Condition } from '@resale/domain/item/condition';
import { editItem, type Item, type ItemEdit, validateItem } from '@resale/domain/item/item';
import { penceOf, poundsOf } from '@resale/domain/money';
import type { ItemDetail } from './itemQueries';

/**
 * The item as the domain checks it: the JSON read back through the item's own
 * rules, dates as dates. Every stored item passed them when it was saved.
 */
export function itemOf({ item }: Pick<ItemDetail, 'item'>): Item {
  const result = validateItem({
    ...item,
    createdAt: new Date(item.createdAt),
    soldAt: item.soldAt === null ? null : new Date(item.soldAt),
    archivedAt: item.archivedAt === null ? null : new Date(item.archivedAt),
  });
  if (!result.ok) throw new Error(`Item ${item.id} doesn't pass the item rules`);
  return result.value;
}

/** Everything the item screen edits, text as typed. */
export type ItemForm = {
  title: string;
  description: string;
  category: Category | null;
  brand: string;
  size: string;
  condition: Condition | null;
  /** Pounds, e.g. "24.50". */
  price: string;
  labels: string[];
  channels: Channel[];
};

export type FormField = keyof ItemForm;

/** What's wrong, by field, as the form shows it. */
export type FormIssues = Partial<Record<FormField, string>>;

export function formOf(item: Item): ItemForm {
  return {
    title: item.title,
    description: item.description ?? '',
    category: item.category,
    brand: item.brand ?? '',
    size: item.size ?? '',
    condition: item.condition,
    price: item.pricePence === null ? '' : poundsOf(item.pricePence),
    labels: item.labels,
    channels: item.channels,
  };
}

/** The domain's field names as the form's. */
const FORM_FIELD: Partial<Record<string, FormField>> = {
  title: 'title',
  description: 'description',
  category: 'category',
  brand: 'brand',
  size: 'size',
  condition: 'condition',
  pricePence: 'price',
  labels: 'labels',
  channels: 'channels',
};

/**
 * The form as an edit for the API, checked by the same rules the API runs
 * (`editItem`), so a save the API would refuse is caught before it's sent.
 */
export function checkForm(
  form: ItemForm,
  item: Item,
): { ok: true; set: ItemEdit } | { ok: false; issues: FormIssues } {
  const pricePence = penceOf(form.price);
  if (pricePence === undefined) {
    return { ok: false, issues: { price: 'Type a price like 24 or 24.50' } };
  }
  const set = {
    title: form.title,
    description: form.description,
    category: form.category,
    brand: form.brand,
    size: form.size,
    condition: form.condition,
    pricePence,
    labels: form.labels,
    channels: form.channels,
  };
  const edited = editItem(item, set);
  if (edited.ok) return { ok: true, set };
  const issues: FormIssues = {};
  for (const issue of edited.issues) {
    const field = FORM_FIELD[issue.path];
    if (field !== undefined) issues[field] ??= issue.message;
  }
  return { ok: false, issues };
}
