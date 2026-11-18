import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { inventoryItem } from './inventoryFixtures';
import { InventoryRow } from './InventoryRow';

const meta = {
  component: InventoryRow,
  args: {
    item: inventoryItem('1', {
      title: 'COS Ivory Silk Blouse',
      brand: 'COS',
      pricePence: 2450,
      channels: ['shop', 'ebay'],
    }),
    selected: false,
    onToggle: fn(),
    onOpen: fn(),
  },
} satisfies Meta<typeof InventoryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Listed: Story = {};

export const Selected: Story = { args: { selected: true } };

export const ToCheck: Story = {
  args: {
    item: inventoryItem('2', {
      title: 'Linen Wide-Leg Trousers',
      pricePence: null,
      size: null,
      toCheck: ['price', 'size'],
    }),
  },
};

export const SoldWithLabels: Story = {
  args: {
    item: inventoryItem('3', {
      title: 'Jigsaw Camel Wool Coat',
      status: 'sold',
      soldAt: '2026-10-12T10:00:00.000Z',
      labels: ['workwear', 'bundle deal'],
    }),
  },
};

export const Archived: Story = {
  args: { item: inventoryItem('4', { title: 'Navy Cashmere Scarf', status: 'archived' }) },
};
