import { createItem } from '@resale/domain/item/item';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { itemDetail } from './itemFixtures';
import { formOf, itemOf } from './itemForm';
import { ItemView } from './ItemView';

const detail = itemDetail();
const form = formOf(itemOf(detail));

const meta = {
  component: ItemView,
  args: {
    isNew: false,
    detail,
    choices: { brands: ['COS', 'Jigsaw', 'Toast'], labels: ['summer', 'workwear', 'vintage'] },
    form,
    issues: {},
    changed: false,
    loading: false,
    error: null,
    saving: false,
    saveError: null,
    conflict: false,
    onChange: fn(),
    onSave: fn(),
    onReload: fn(),
    onBack: fn(),
    history: [
      {
        id: 's1',
        at: '2026-11-01T09:30:00.000Z',
        by: 'demo',
        lines: [{ field: 'Price', from: '£24.00', to: '£24.50' }],
      },
    ],
    historyError: null,
    waitReason: null,
    acting: false,
    actionError: null,
    onStatus: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ItemView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};

export const Changed: Story = {
  args: {
    form: { ...form, price: '22' },
    changed: true,
    waitReason: 'Save or discard your changes first',
  },
};

export const Saving: Story = {
  args: { form: { ...form, price: '22' }, changed: true, saving: true },
};

export const Invalid: Story = {
  args: {
    form: { ...form, title: '', price: '' },
    changed: true,
    issues: { title: 'A title is needed', channels: 'To list it, add: price' },
  },
};

/** Someone else saved it meanwhile: the save was refused. */
export const Conflict: Story = {
  args: {
    form: { ...form, price: '22' },
    changed: true,
    saveError: 'This item changed since you opened it. Reload it and try again',
    conflict: true,
  },
};

export const Sold: Story = {
  args: {
    detail: itemDetail(
      { status: 'sold', soldAt: '2026-11-02T10:00:00.000Z', channels: [] },
      { statusActions: ['receiveReturn', 'archive'] },
    ),
  },
};

export const New: Story = {
  args: {
    isNew: true,
    detail: null,
    form: formOf(createItem({ id: 'new', createdAt: new Date() })),
    history: [],
  },
};

export const Loading: Story = { args: { detail: null, form: null, loading: true } };

export const LoadFailed: Story = {
  args: { detail: null, form: null, error: 'This item no longer exists' },
};
