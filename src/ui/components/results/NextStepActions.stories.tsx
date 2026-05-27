import type { Meta, StoryObj } from '@storybook/react';
import { NextStepActions } from './NextStepActions';

const meta: Meta<typeof NextStepActions> = {
  title: 'Results/NextStepActions',
  component: NextStepActions,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onScrollToAffordability: { action: 'scrollToAffordability' },
    onScrollToRefinancing: { action: 'scrollToRefinancing' },
    onScrollToAmortization: { action: 'scrollToAmortization' },
  },
};

export default meta;
type Story = StoryObj<typeof NextStepActions>;

export const Default: Story = {
  args: {
    onScrollToAffordability: () => {},
    onScrollToRefinancing: () => {},
    onScrollToAmortization: () => {},
  },
};
