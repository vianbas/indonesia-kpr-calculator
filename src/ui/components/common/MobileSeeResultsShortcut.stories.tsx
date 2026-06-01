import type { Meta, StoryObj } from '@storybook/react';
import { MobileSeeResultsShortcut } from './MobileSeeResultsShortcut';

const meta: Meta<typeof MobileSeeResultsShortcut> = {
  title: 'Common/MobileSeeResultsShortcut',
  component: MobileSeeResultsShortcut,
  // Shown only below the `sm` breakpoint — use a mobile viewport to see it.
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'mobile1' } },
  argTypes: { onClick: { action: 'seeResults' } },
};

export default meta;
type Story = StoryObj<typeof MobileSeeResultsShortcut>;

export const WithSummary: Story = {
  args: {
    hasSummary: true,
    hasErrors: false,
    label: 'Lihat Hasil',
    ariaLabel: 'Lompat ke hasil perhitungan',
    onClick: () => {},
  },
};

export const WithErrors: Story = {
  args: {
    hasSummary: false,
    hasErrors: true,
    label: 'Lihat Hasil',
    ariaLabel: 'Lompat ke formulir untuk memperbaiki kesalahan',
    onClick: () => {},
  },
};

export const HiddenWhenNothingToShow: Story = {
  args: {
    hasSummary: false,
    hasErrors: false,
    label: 'Lihat Hasil',
    ariaLabel: 'Lompat',
    onClick: () => {},
  },
};
