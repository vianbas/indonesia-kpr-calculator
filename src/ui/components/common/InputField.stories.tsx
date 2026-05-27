import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { InputField } from './InputField';

const meta: Meta<typeof InputField> = {
  title: 'Common/InputField',
  component: InputField,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof InputField>;

export const Default: Story = {
  args: {
    label: 'Nilai Kredit',
    value: '',
    placeholder: '0',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Nilai Kredit',
    value: '500000000',
    placeholder: '0',
  },
};

export const WithPrefix: Story = {
  args: {
    label: 'Harga Properti',
    value: '700000000',
    prefix: 'Rp',
    placeholder: '0',
    type: 'number',
    hint: 'Rp 700.000.000',
  },
};

export const WithSuffix: Story = {
  args: {
    label: 'Suku Bunga Tetap',
    value: '7',
    suffix: '%',
    placeholder: '0',
    type: 'number',
    min: '0',
    max: '30',
    step: '0.25',
    hint: 'Suku bunga tetap per tahun',
  },
};

export const WithError: Story = {
  args: {
    label: 'Uang Muka',
    value: '-100000',
    prefix: 'Rp',
    placeholder: '0',
    error: 'Uang muka tidak boleh negatif',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Tenor',
    value: '20',
    suffix: 'Tahun',
    placeholder: '0',
    type: 'number',
    hint: 'Total: 240 bulan',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Nilai Kredit (dihitung otomatis)',
    value: '500000000',
    prefix: 'Rp',
    disabled: true,
    hint: 'Harga properti − uang muka',
  },
};

function ControlledDemo() {
  const [value, setValue] = useState('500000000');
  const formatted = value ? `Rp ${Number(value).toLocaleString('id-ID')}` : '';
  return (
    <InputField
      label="Nilai Kredit"
      value={value}
      onChange={setValue}
      prefix="Rp"
      type="number"
      placeholder="0"
      hint={formatted || 'Masukkan nilai kredit'}
    />
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};
