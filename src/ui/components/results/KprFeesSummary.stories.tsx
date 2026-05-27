import type { Meta, StoryObj } from '@storybook/react';
import { KprFeesSummary } from './KprFeesSummary';
import { SUMMARY_FIXED_FLOATING, SUMMARY_FIXED_ONLY } from '../../../stories/fixtures';

const meta: Meta<typeof KprFeesSummary> = {
  title: 'Results/KprFeesSummary',
  component: KprFeesSummary,
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
type Story = StoryObj<typeof KprFeesSummary>;

export const FullFees: Story = {
  args: { summary: SUMMARY_FIXED_FLOATING },
};

export const DPOnly: Story = {
  args: { summary: SUMMARY_FIXED_ONLY },
};
