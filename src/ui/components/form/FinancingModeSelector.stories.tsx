import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FinancingModeSelector } from './FinancingModeSelector';
import type { FinancingMode } from '../../../domain/models/mortgage.types';
import type { FormAction } from '../../../application/store/formTypes';

const meta: Meta<typeof FinancingModeSelector> = {
  title: 'Form/FinancingModeSelector',
  component: FinancingModeSelector,
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
type Story = StoryObj<typeof FinancingModeSelector>;

function InteractiveWrapper({ initial }: { initial: FinancingMode }) {
  const [mode, setMode] = useState<FinancingMode>(initial);
  const dispatch = (action: FormAction) => {
    if (action.type === 'SET_FINANCING_MODE') setMode(action.mode);
  };
  return <FinancingModeSelector financingMode={mode} dispatch={dispatch} />;
}

export const Conventional: Story = {
  render: () => <InteractiveWrapper initial="conventional" />,
};

export const Syariah: Story = {
  render: () => <InteractiveWrapper initial="syariah" />,
};
