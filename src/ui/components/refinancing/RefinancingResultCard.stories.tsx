import type { Meta, StoryObj } from '@storybook/react';
import { RefinancingResultCard } from './RefinancingResultCard';
import { REFI_WORTH_IT, REFI_MARGINAL, REFI_NOT_WORTH_IT } from '../../../stories/fixtures';

const meta: Meta<typeof RefinancingResultCard> = {
  title: 'Refinancing/RefinancingResultCard',
  component: RefinancingResultCard,
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
type Story = StoryObj<typeof RefinancingResultCard>;

export const WorthIt: Story = {
  args: { result: REFI_WORTH_IT },
};

export const Marginal: Story = {
  args: { result: REFI_MARGINAL },
};

export const NotWorthIt: Story = {
  args: { result: REFI_NOT_WORTH_IT },
};

export const AllRecommendations: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <RefinancingResultCard result={REFI_WORTH_IT} />
      <RefinancingResultCard result={REFI_MARGINAL} />
      <RefinancingResultCard result={REFI_NOT_WORTH_IT} />
    </div>
  ),
  parameters: { layout: 'padded' },
};
