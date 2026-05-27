import type { Meta, StoryObj } from '@storybook/react';
import { EarlyRepaymentSummary } from './EarlyRepaymentSummary';
import { SUMMARY_WITH_SAVINGS, SUMMARY_FIXED_ONLY } from '../../../stories/fixtures';

const meta: Meta<typeof EarlyRepaymentSummary> = {
  title: 'Results/EarlyRepaymentSummary',
  component: EarlyRepaymentSummary,
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
type Story = StoryObj<typeof EarlyRepaymentSummary>;

export const WithSavings: Story = {
  args: { summary: SUMMARY_WITH_SAVINGS },
};

export const NoSavings: Story = {
  args: { summary: SUMMARY_FIXED_ONLY },
  parameters: {
    docs: {
      description: {
        story: 'Returns null when monthsSaved and interestSaved are both 0.',
      },
    },
  },
};
