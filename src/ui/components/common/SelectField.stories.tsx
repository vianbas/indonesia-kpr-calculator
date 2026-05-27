import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectField } from './SelectField';

type PaymentMethod = 'annuity' | 'flat';

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'annuity', label: 'Anuitas — Cicilan tetap per bulan' },
  { value: 'flat', label: 'Flat — Pokok tetap per bulan' },
];

const meta: Meta<typeof SelectField> = {
  title: 'Common/SelectField',
  component: SelectField,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof SelectField>;

export const Default: Story = {
  args: {
    label: 'Metode Perhitungan',
    value: 'annuity',
    options: PAYMENT_OPTIONS,
  },
};

export const WithHint: Story = {
  args: {
    label: 'Metode Perhitungan',
    value: 'annuity',
    options: PAYMENT_OPTIONS,
    hint: 'Anuitas: cicilan bulanan tetap',
  },
};

export const WithError: Story = {
  args: {
    label: 'Metode Perhitungan',
    value: '',
    options: [{ value: '', label: 'Pilih metode...' }, ...PAYMENT_OPTIONS],
    error: 'Pilih metode perhitungan',
  },
};

function ControlledDemo() {
  const [value, setValue] = useState<PaymentMethod>('annuity');
  const hints: Record<string, string> = {
    annuity: 'Cicilan bulanan tetap; komposisi pokok/bunga berubah tiap bulan',
    flat: 'Pokok tetap; bunga dihitung dari pokok awal (cicilan lebih tinggi di awal)',
  };
  return (
    <SelectField
      label="Metode Perhitungan"
      value={value}
      onChange={(v) => setValue(v)}
      options={PAYMENT_OPTIONS}
      hint={hints[value]}
    />
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};
