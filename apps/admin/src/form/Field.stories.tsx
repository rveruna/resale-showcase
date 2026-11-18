import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TextInput } from 'react-native';
import { Field, inputStyle } from './Field';

const meta = {
  component: Field,
  args: { label: 'Title', children: <TextInput style={inputStyle} value="Ivory Silk Blouse" /> },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const WithHint: Story = { args: { hint: '17 of 80 characters' } };

export const WithCounter: Story = { args: { counter: { text: '17/80', over: false } } };

export const WithError: Story = { args: { error: 'Type a price like 24 or 24.50' } };
