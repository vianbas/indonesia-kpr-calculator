import type { Meta, StoryObj } from '@storybook/react';
import { DecisionToolsNav } from './DecisionToolsNav';

const meta: Meta<typeof DecisionToolsNav> = {
  title: 'Common/DecisionToolsNav',
  component: DecisionToolsNav,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof DecisionToolsNav>;

export const FullStack: Story = {
  args: {
    sections: [
      { id: 'section-results', label: 'Hasil' },
      { id: 'section-max-property', label: 'Estimasi Harga' },
      { id: 'section-affordability', label: 'Kemampuan Bayar' },
      { id: 'section-refinancing', label: 'Refinancing' },
      { id: 'section-buy-vs-rent', label: 'Beli vs Sewa' },
      { id: 'section-flpp', label: 'FLPP' },
      { id: 'section-comparison', label: 'Bandingkan' },
    ],
  },
};

export const HiddenWithOneSection: Story = {
  args: { sections: [{ id: 'section-results', label: 'Hasil' }] },
};
