import type { Meta, StoryObj } from '@storybook/react';
import { AffordabilityScenarioCard } from './AffordabilityScenarioCard';
import {
  AFFORDABILITY_SAFE,
  AFFORDABILITY_WATCH,
  AFFORDABILITY_RISKY,
} from '../../../stories/fixtures';

const meta: Meta<typeof AffordabilityScenarioCard> = {
  title: 'Affordability/AffordabilityScenarioCard',
  component: AffordabilityScenarioCard,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    maxDSR: {
      control: { type: 'range', min: 0.1, max: 0.7, step: 0.05 },
      description: 'DSR limit as decimal (e.g. 0.35 = 35%)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AffordabilityScenarioCard>;

export const Safe: Story = {
  args: { label: 'Hasil Analisis', result: AFFORDABILITY_SAFE, maxDSR: 0.35 },
};

export const Watch: Story = {
  args: { label: 'Skenario 1', result: AFFORDABILITY_WATCH, maxDSR: 0.35 },
};

export const Risky: Story = {
  args: { label: 'Skenario 2', result: AFFORDABILITY_RISKY, maxDSR: 0.35 },
};

export const HighDSRLimit: Story = {
  args: { label: 'Batas DSR 50%', result: AFFORDABILITY_WATCH, maxDSR: 0.5 },
};

export const AllBands: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AffordabilityScenarioCard label="Aman" result={AFFORDABILITY_SAFE} maxDSR={0.35} />
      <AffordabilityScenarioCard label="Waspada" result={AFFORDABILITY_WATCH} maxDSR={0.35} />
      <AffordabilityScenarioCard label="Berisiko" result={AFFORDABILITY_RISKY} maxDSR={0.35} />
    </div>
  ),
  parameters: { layout: 'padded' },
  decorators: [],
};
