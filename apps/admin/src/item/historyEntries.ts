import { CATEGORIES, type Category } from '@resale/domain/item/categories';
import { type Channel, CHANNELS } from '@resale/domain/item/channels';
import { type Condition, CONDITIONS } from '@resale/domain/item/condition';
import { formatPrice } from '@resale/domain/money';
import type { ItemChanges } from './itemQueries';

/** One press of Save or a status button: when, by whom, and each field it changed. */
export type HistoryEntry = {
  id: string;
  at: string;
  by: string;
  lines: { field: string; from: string; to: string }[];
};

const FIELD_NAMES: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  brand: 'Brand',
  size: 'Size',
  condition: 'Condition',
  pricePence: 'Price',
  labels: 'Labels',
  channels: 'Listed on',
  status: 'Status',
  soldAt: 'Sold',
  archivedAt: 'Archived',
};

const isIn = <K extends string>(record: Record<K, string>, key: unknown): key is K =>
  typeof key === 'string' && Object.hasOwn(record, key);

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });

/** A stored value as she'd say it: "£24.50", "Shirts & blouses", "eBay, Vinted". */
function text(field: string, value: unknown): string {
  if (value === null || (Array.isArray(value) && value.length === 0)) return '—';
  if (field === 'pricePence' && typeof value === 'number') return formatPrice(value);
  if (field === 'category' && isIn<Category>(CATEGORIES, value)) return CATEGORIES[value];
  if (field === 'condition' && isIn<Condition>(CONDITIONS, value)) return CONDITIONS[value];
  if (field === 'channels' && Array.isArray(value)) {
    return value
      .map((channel) => (isIn<Channel>(CHANNELS, channel) ? CHANNELS[channel] : String(channel)))
      .join(', ');
  }
  if ((field === 'soldAt' || field === 'archivedAt') && typeof value === 'string')
    return day(value);
  if (Array.isArray(value)) return value.join(', ');
  if (field === 'status' && typeof value === 'string') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return String(value);
}

/** The history rows as one entry per save, newest first, fields in the order saved. */
export function historyEntries(changes: ItemChanges): HistoryEntry[] {
  const entries = new Map<string, HistoryEntry>();
  for (const change of changes) {
    const entry = entries.get(change.saveId) ?? {
      id: change.saveId,
      at: change.createdAt,
      by: change.createdBy,
      lines: [],
    };
    entry.lines.push({
      field: FIELD_NAMES[change.field] ?? change.field,
      from: text(change.field, change.oldValue),
      to: text(change.field, change.newValue),
    });
    entries.set(change.saveId, entry);
  }
  return [...entries.values()];
}
