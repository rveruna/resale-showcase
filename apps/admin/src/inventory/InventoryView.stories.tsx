import { DEFAULT_QUERY } from '@resale/domain/inventory/inventoryList';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { inventoryItem } from './inventoryFixtures';
import { InventoryView } from './InventoryView';

const items = [
  inventoryItem('5', {
    title: 'COS Ivory Silk Blouse',
    brand: 'COS',
    pricePence: 2450,
    channels: ['shop', 'ebay'],
    labels: ['summer'],
  }),
  inventoryItem('4', {
    title: 'Linen Wide-Leg Trousers',
    category: 'trousers',
    pricePence: null,
    toCheck: ['price'],
  }),
  inventoryItem('3', {
    title: 'Toast Sage Cashmere Jumper',
    brand: 'Toast',
    category: 'knitwear',
    size: 'M',
    pricePence: 4800,
    channels: ['vinted'],
  }),
];

const meta = {
  component: InventoryView,
  args: {
    query: DEFAULT_QUERY,
    onChangeQuery: fn(),
    items,
    total: 23,
    counts: { available: 23, toCheck: 4, sold: 12, archived: 3, all: 38 },
    loading: false,
    error: null,
    onRetry: fn(),
    page: 1,
    pageCount: 3,
    pageSize: 10,
    onPage: fn(),
    onPageSize: fn(),
    labels: ['summer', 'workwear', 'bundle deal'],
    selected: new Set<string>(),
    onToggle: fn(),
    onTogglePage: fn(),
    onClearSelection: fn(),
    bulk: {
      actions: [
        { action: 'markSold', enabled: true },
        { action: 'receiveReturn', enabled: false },
        { action: 'archive', enabled: true },
        { action: 'unarchive', enabled: false },
      ],
      pending: false,
      error: null,
      onApply: fn(),
      onDismissError: fn(),
    },
    onOpenItem: fn(),
    onNewItem: fn(),
  },
} satisfies Meta<typeof InventoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = { args: { items: [], total: null, counts: null, loading: true } };

export const LoadFailed: Story = {
  args: { items: [], total: null, counts: null, error: 'No connection to the server' },
};

export const Empty: Story = {
  args: { items: [], total: 0, pageCount: 1, query: { ...DEFAULT_QUERY, search: 'velvet' } },
};

export const Ticked: Story = { args: { selected: new Set(['5', '3']) } };

export const Saving: Story = {
  args: { selected: new Set(['5', '3']), bulk: { ...meta.args.bulk, pending: true } },
};

/** The API refused the bulk change: the rows are back as they were. */
export const BulkRefused: Story = {
  args: {
    selected: new Set(['5', '3']),
    bulk: {
      ...meta.args.bulk,
      error: 'Nothing changed. This item changed since you opened it. Reload it and try again',
    },
  },
};

export const SortedByPriceCheapestFirst: Story = {
  args: { query: { ...DEFAULT_QUERY, sort: 'price', direction: 'asc', channel: 'ebay' } },
};
