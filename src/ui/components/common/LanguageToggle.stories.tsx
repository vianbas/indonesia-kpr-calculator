import type { Meta, StoryObj } from '@storybook/react';
import { LanguageToggle } from './LanguageToggle';

const meta: Meta<typeof LanguageToggle> = {
  title: 'Common/LanguageToggle',
  component: LanguageToggle,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof LanguageToggle>;

export const OnWhiteBackground: Story = {
  decorators: [
    (Story) => (
      <div className="bg-blue-700 px-4 py-3 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export const OnDarkBackground: Story = {
  decorators: [
    (Story) => (
      <div className="bg-blue-900 px-4 py-3 rounded-lg">
        <Story />
      </div>
    ),
  ],
};
