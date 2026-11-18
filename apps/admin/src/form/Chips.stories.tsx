import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { Chips } from './Chips';

const meta = {
  component: Chips,
  args: {
    options: [
      { value: 'shop', label: 'Shop' },
      { value: 'ebay', label: 'eBay' },
      { value: 'vinted', label: 'Vinted' },
    ],
    selected: ['ebay'],
    onPress: fn(),
  },
} satisfies Meta<typeof Chips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneSelected: Story = {};

export const SeveralSelected: Story = { args: { selected: ['shop', 'vinted'] } };

export const NoneSelected: Story = { args: { selected: [] } };
