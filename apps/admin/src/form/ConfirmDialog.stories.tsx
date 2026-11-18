import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  component: ConfirmDialog,
  args: {
    visible: true,
    title: 'Mark sold today?',
    message: 'If it comes back, press Return received.',
    confirmLabel: 'Mark sold',
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirm: Story = {};

export const Destructive: Story = {
  args: {
    title: 'Delete this item for good?',
    message: 'Ivory Silk Blouse goes with its history. This can’t be undone.',
    confirmLabel: 'Delete',
    destructive: true,
  },
};

export const ThreeChoices: Story = {
  args: {
    title: 'Save your changes?',
    message: 'The details you changed aren’t saved yet.',
    confirmLabel: 'Save',
    other: { label: 'Discard', onPress: fn() },
  },
};
