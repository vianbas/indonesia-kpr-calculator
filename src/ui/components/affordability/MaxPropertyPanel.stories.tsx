import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MaxPropertyPanel } from './MaxPropertyPanel';
import { DEFAULT_MAX_PROPERTY, type MaxPropertyFormState } from '../../../application/store/maxPropertyTypes';

// Stateful wrapper so the panel is interactive in Storybook.
function Demo({ initial }: { initial: MaxPropertyFormState }) {
  const [form, setForm] = useState<MaxPropertyFormState>(initial);
  return (
    <MaxPropertyPanel
      form={form}
      onChange={(key, value) => setForm((p) => ({ ...p, [key]: value }))}
    />
  );
}

const meta: Meta<typeof MaxPropertyPanel> = {
  title: 'Affordability/MaxPropertyPanel',
  component: MaxPropertyPanel,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof MaxPropertyPanel>;

const conventional: MaxPropertyFormState = {
  ...DEFAULT_MAX_PROPERTY,
  monthlyIncome: '20000000',
  spouseIncome: '10000000',
};

export const Empty: Story = {
  render: () => <Demo initial={DEFAULT_MAX_PROPERTY} />,
};

export const ConventionalSafe: Story = {
  render: () => <Demo initial={conventional} />,
};

export const SyariahSafe: Story = {
  render: () => <Demo initial={{ ...conventional, financingMode: 'syariah' }} />,
};

export const ExistingDebtReducesCapacity: Story = {
  render: () => <Demo initial={{ ...conventional, existingMonthlyDebt: '4000000' }} />,
};

export const NoCapacity: Story = {
  render: () => <Demo initial={{ ...conventional, monthlyIncome: '3000000', spouseIncome: '0', existingMonthlyDebt: '2000000' }} />,
};

export const HighDownPayment: Story = {
  render: () => <Demo initial={{ ...conventional, downPaymentPercent: '50' }} />,
};
