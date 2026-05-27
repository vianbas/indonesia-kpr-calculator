import type { Meta, StoryObj } from '@storybook/react';
import { SummaryCard } from './SummaryCard';
import {
  SUMMARY_FIXED_ONLY,
  SUMMARY_FIXED_FLOATING,
  SUMMARY_WITH_SAVINGS,
  SUMMARY_MURABAHAH,
  SUMMARY_MMQ,
} from '../../../stories/fixtures';

const meta: Meta<typeof SummaryCard> = {
  title: 'Results/SummaryCard',
  component: SummaryCard,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SummaryCard>;

export const FixedOnly: Story = {
  args: { summary: SUMMARY_FIXED_ONLY },
};

export const FixedPlusFloating: Story = {
  args: { summary: SUMMARY_FIXED_FLOATING },
};

export const WithEarlyRepaymentSavings: Story = {
  args: { summary: SUMMARY_WITH_SAVINGS },
};

export const SyariahMurabahah: Story = {
  args: { summary: SUMMARY_MURABAHAH },
};

export const SyariahMmq: Story = {
  args: { summary: SUMMARY_MMQ },
};
