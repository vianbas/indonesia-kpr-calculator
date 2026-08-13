import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // Storybook 9 removed @storybook/addon-essentials: controls, actions,
  // viewport, backgrounds, toolbars, measure and outline are all part of the
  // `storybook` core now. Only docs (autodocs) and a11y stay separate packages.
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
