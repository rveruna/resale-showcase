import { z } from 'zod';
import { fail, ok } from '../result';
import { CATEGORY_KEYS, hasSize } from './categories';
import { CHANNEL_KEYS } from './channels';
import { CONDITION_KEYS } from './condition';
import { ITEM_STATUSES } from './status';

/**
 * Capitalises the first letter of every word; letters typed as capitals stay,
 * so "COS" and "UK 12" keep their spelling.
 */
export function capitaliseTitle(title: string): string {
  return title.replace(
    /(^|\s)(\p{Ll})/gu,
    (_, space: string, letter: string) => space + letter.toUpperCase(),
  );
}

/** eBay's title limit, which every channel's listing has to fit. */
export const MAX_TITLE_LENGTH = 80;

/** Blank text is "not filled in". */
const optionalText = z
  .string()
  .trim()
  .nullable()
  .transform((text) => (text === null || text === '' ? null : text));

/** Labels are case-insensitive: "Summer" and "summer" are one label; the first spelling stays. */
const labelsSchema = z
  .array(z.string().trim().min(1))
  .transform((labels) =>
    labels.filter(
      (label, index) =>
        labels.findIndex((other) => other.toLowerCase() === label.toLowerCase()) === index,
    ),
  );

/** In a fixed order, each once, so a reordered pick isn't a change. */
const channelsSchema = z
  .array(z.enum(CHANNEL_KEYS))
  .transform((channels) => CHANNEL_KEYS.filter((channel) => channels.includes(channel)));

/**
 * Every item. Only the title is needed to save, so half-finished items can be
 * saved; `missingForListing` says what a listing still needs.
 */
const itemFields = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, 'A title is needed')
    .max(MAX_TITLE_LENGTH, `At most ${MAX_TITLE_LENGTH} characters`)
    .transform(capitaliseTitle),
  description: optionalText,
  category: z.enum(CATEGORY_KEYS).nullable(),
  brand: optionalText,
  size: optionalText,
  condition: z.enum(CONDITION_KEYS).nullable(),
  pricePence: z.number().int().positive('A price is more than £0').max(1_000_000).nullable(),
  labels: labelsSchema,
  /** Where it's listed now. */
  channels: channelsSchema,
  status: z.enum(ITEM_STATUSES),
  soldAt: z.date().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Item = z.output<typeof itemFields>;

/** What a listing needs that a saved item may still lack. */
export type ListingRequirement = 'price' | 'category' | 'size' | 'condition';

export function missingForListing(item: Item): ListingRequirement[] {
  const missing: ListingRequirement[] = [];
  if (item.pricePence === null) missing.push('price');
  if (item.category === null) missing.push('category');
  if (item.size === null && (item.category === null || hasSize(item.category))) {
    missing.push('size');
  }
  if (item.condition === null) missing.push('condition');
  return missing;
}

const itemSchema = itemFields.superRefine((item, context) => {
  if (item.category !== null && !hasSize(item.category) && item.size !== null) {
    context.addIssue({ code: 'custom', path: ['size'], message: 'Accessories have no size' });
  }
  if (item.status === 'available' && item.soldAt !== null) {
    context.addIssue({ code: 'custom', path: ['soldAt'], message: 'Only a sold item has a date' });
  }
  if (item.channels.length > 0 && item.status !== 'available') {
    context.addIssue({
      code: 'custom',
      path: ['channels'],
      message: 'Only an available item can be listed',
    });
  }
  const missing = missingForListing(item);
  if (item.channels.length > 0 && missing.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['channels'],
      message: `To list it, add: ${missing.join(', ')}`,
    });
  }
});

/** One reason an item can't be saved, by field. */
export type ValidationIssue = { path: string; message: string };

export type ItemOutcome =
  { ok: true; value: Item } | { ok: false; error: 'INVALID_ITEM'; issues: ValidationIssue[] };

/** Checks anything claiming to be an item against the rules above. */
export function validateItem(input: unknown): ItemOutcome {
  const parsed = itemSchema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return {
    ...fail('INVALID_ITEM'),
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/** What the item screen can change: the descriptive fields and where it's listed. */
export const itemEditSchema = itemFields
  .pick({
    title: true,
    description: true,
    category: true,
    brand: true,
    size: true,
    condition: true,
    pricePence: true,
    labels: true,
    channels: true,
  })
  .partial();

export type ItemEdit = z.input<typeof itemEditSchema>;

/** The item with the edit applied, checked by every rule; a left-out field stays. */
export function editItem(item: Item, edit: ItemEdit): ItemOutcome {
  const defined = Object.fromEntries(
    Object.entries(edit).filter(([, value]) => value !== undefined),
  );
  return validateItem({ ...item, ...defined });
}

/** A new item before its first save: untitled, available, nothing filled in. */
export function createItem({ id, createdAt }: { id: string; createdAt: Date }): Item {
  return {
    id,
    title: '',
    description: null,
    category: null,
    brand: null,
    size: null,
    condition: null,
    pricePence: null,
    labels: [],
    channels: [],
    status: 'available',
    soldAt: null,
    archivedAt: null,
    createdAt,
  };
}

/** Prefixes a copy's title, so it stands out in the list until edited. */
export const COPY_PREFIX = 'Copy Of ';

/** A copy to list a similar piece: same details, new id, not sold, listed nowhere. */
export function duplicateItem(item: Item, { id, createdAt }: { id: string; createdAt: Date }) {
  return validateItem({
    ...item,
    id,
    createdAt,
    title: `${COPY_PREFIX}${item.title}`.slice(0, MAX_TITLE_LENGTH),
    status: 'available',
    soldAt: null,
    archivedAt: null,
    channels: [],
  });
}
