import type { Preview } from '@storybook/react';
import '../src/index.css';
import '../src/i18n';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'gray-50',
      values: [
        { name: 'white', value: '#ffffff' },
        { name: 'gray-50', value: '#f9fafb' },
        { name: 'dark', value: '#1f2937' },
      ],
    },
    a11y: {
      config: {},
    },
    docs: {
      toc: true,
    },
  },
  tags: ['autodocs'],
};

export default preview;
