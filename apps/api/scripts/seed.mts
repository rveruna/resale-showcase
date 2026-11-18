/**
 * Prints SQL that fills the local database with demo stock (`pnpm db:reset`).
 * Deterministic: the same 60 items every time, some missing what a listing needs
 * so To check has something in it.
 */
import type { Category } from '@resale/domain/item/categories';
import type { Channel } from '@resale/domain/item/channels';
import type { Condition } from '@resale/domain/item/condition';
import { createItem, editItem, type Item, missingForListing } from '@resale/domain/item/item';
import { archive, markSold } from '@resale/domain/item/status';

let state = 42;
/** A small seeded generator, so the demo data never changes between resets. */
const random = () => {
  state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
  return state / 2 ** 31;
};
const pick = <T,>(options: readonly T[]): T => options[Math.floor(random() * options.length)]!;

const PIECES: [Category, string][] = [
  ['shirts', 'blouse'],
  ['shirts', 'shirt'],
  ['tops', 'camisole'],
  ['tops', 'tee'],
  ['dresses', 'slip dress'],
  ['dresses', 'midi dress'],
  ['skirts', 'bias-cut skirt'],
  ['trousers', 'wide-leg trousers'],
  ['knitwear', 'jumper'],
  ['knitwear', 'cardigan'],
  ['coats', 'trench coat'],
  ['accessories', 'scarf'],
];
const MATERIALS = ['silk', 'linen', 'cashmere', 'wool', 'cotton', 'satin'];
const COLOURS = ['ivory', 'black', 'navy', 'sage', 'rust', 'dusty pink', 'camel', 'cream'];
const BRANDS = ['COS', 'Jigsaw', 'Whistles', '& Other Stories', 'Arket', 'Toast', 'Hobbs', null];
const SIZES = ['UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'S', 'M', 'L'];
const CONDITIONS: Condition[] = ['newWithTags', 'likeNew', 'good', 'good', 'fair'];
const LABELS = ['summer', 'workwear', 'needs steaming', 'bundle deal', 'vintage'];
const CHANNEL_SETS: Channel[][] = [[], ['shop'], ['ebay'], ['vinted'], ['ebay', 'vinted']];

const DAY = 86_400_000;
const start = Date.UTC(2026, 7, 1, 9, 0, 0);

function demoItem(index: number): Item {
  const [category, piece] = pick(PIECES);
  const material = pick(MATERIALS);
  const brand = pick(BRANDS);
  const createdAt = new Date(start + index * 1.6 * DAY + Math.floor(random() * 8) * 3_600_000);
  const title = `${brand === null ? '' : `${brand} `}${pick(COLOURS)} ${material} ${piece}`;
  const incomplete = random() < 0.2;
  const edited = editItem(createItem({ id: `demo-${String(index).padStart(3, '0')}`, createdAt }), {
    title,
    description: `A ${material} ${piece} in lovely condition. Measurements on request.`,
    category,
    brand,
    size: category === 'accessories' || (incomplete && random() < 0.5) ? null : pick(SIZES),
    condition: pick(CONDITIONS),
    pricePence: incomplete ? null : (8 + Math.floor(random() * 60)) * 100 + pick([0, 0, 50, 99]),
    labels: random() < 0.4 ? [pick(LABELS)] : [],
  });
  if (!edited.ok) throw new Error(`Demo item ${index}: ${JSON.stringify(edited.issues)}`);
  let item = edited.value;
  if (missingForListing(item).length === 0) item = { ...item, channels: pick(CHANNEL_SETS) };
  const fate = random();
  const later = new Date(createdAt.getTime() + (3 + Math.floor(random() * 20)) * DAY);
  if (fate < 0.18 && item.status === 'available' && missingForListing(item).length === 0) {
    const sold = markSold(item, later);
    if (sold.ok) item = sold.value;
  } else if (fate > 0.93) {
    const archived = archive(item, later);
    if (archived.ok) item = archived.value;
  }
  return item;
}

const text = (value: string | null) =>
  value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;
const time = (value: Date | null) => (value === null ? 'NULL' : String(value.getTime()));

const rows = Array.from({ length: 60 }, (_, index) => demoItem(index + 1)).map(
  (item) =>
    `(${[
      text(item.id),
      text(item.title),
      text(item.description),
      text(item.category),
      text(item.brand),
      text(item.size),
      text(item.condition),
      item.pricePence === null ? 'NULL' : String(item.pricePence),
      text(JSON.stringify(item.labels)),
      text(JSON.stringify(item.channels)),
      text(item.status),
      time(item.soldAt),
      time(item.archivedAt),
      '1',
      time(item.createdAt),
      time(item.createdAt),
      text('demo'),
    ].join(', ')})`,
);

console.log(
  `INSERT INTO items (id, title, description, category, brand, size, condition, price_pence, labels, channels, status, sold_at, archived_at, version, created_at, updated_at, updated_by) VALUES\n${rows.join(',\n')};`,
);
