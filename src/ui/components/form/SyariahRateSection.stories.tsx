import type { Meta, StoryObj } from '@storybook/react';
import { useReducer } from 'react';
import { SyariahRateSection } from './SyariahRateSection';
import { formReducer, createDefaultFormState } from '../../../application/store/formReducer';

const meta: Meta<typeof SyariahRateSection> = {
  title: 'Form/SyariahRateSection',
  component: SyariahRateSection,
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
type Story = StoryObj<typeof SyariahRateSection>;

function MurabahahWrapper() {
  const [form, dispatch] = useReducer(formReducer, undefined, () => ({
    ...createDefaultFormState(),
    financingMode: 'syariah' as const,
    syariahAkadType: 'murabahah' as const,
    syariahMarginPercent: '8',
  }));
  return <SyariahRateSection form={form} dispatch={dispatch} />;
}

function MmqWrapper() {
  const [form, dispatch] = useReducer(formReducer, undefined, () => ({
    ...createDefaultFormState(),
    financingMode: 'syariah' as const,
    syariahAkadType: 'musyarakah_mutanaqishah' as const,
    syariahUjrahPercent: '8',
    syariahBankSharePercent: '80',
  }));
  return <SyariahRateSection form={form} dispatch={dispatch} />;
}

export const Murabahah: Story = {
  render: () => <MurabahahWrapper />,
};

export const MusyarakahMutanaqishah: Story = {
  render: () => <MmqWrapper />,
};
