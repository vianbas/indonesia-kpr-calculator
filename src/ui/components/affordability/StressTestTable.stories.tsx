import type { Meta, StoryObj } from '@storybook/react';
import { StressTestTable } from './StressTestTable';
import { AFFORDABILITY_SAFE, AFFORDABILITY_RISKY } from '../../../stories/fixtures';

const meta: Meta<typeof StressTestTable> = {
  title: 'Affordability/StressTestTable',
  component: StressTestTable,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    maxDSR: {
      control: { type: 'range', min: 0.1, max: 0.7, step: 0.05 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StressTestTable>;

export const Safe: Story = {
  args: {
    rows: AFFORDABILITY_SAFE.stressTest,
    maxDSR: 0.35,
  },
};

export const Risky: Story = {
  args: {
    rows: AFFORDABILITY_RISKY.stressTest,
    maxDSR: 0.35,
  },
};
