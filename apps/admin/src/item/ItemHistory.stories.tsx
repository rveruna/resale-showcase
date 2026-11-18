import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ItemHistory } from './ItemHistory';

const meta = {
  component: ItemHistory,
  args: {
    entries: [
      {
        id: 's2',
        at: '2026-11-02T10:00:00.000Z',
        by: 'demo',
        lines: [
          { field: 'Status', from: 'Available', to: 'Sold' },
          { field: 'Listed on', from: 'eBay, Vinted', to: '—' },
        ],
      },
      {
        id: 's1',
        at: '2026-11-01T09:30:00.000Z',
        by: 'demo',
        lines: [{ field: 'Price', from: '£24.00', to: '£22.00' }],
      },
    ],
    error: null,
  },
} satisfies Meta<typeof ItemHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithChanges: Story = {};

export const NoChanges: Story = { args: { entries: [] } };

export const Loading: Story = { args: { entries: null } };

export const Failed: Story = { args: { entries: null, error: 'No connection to the server' } };
