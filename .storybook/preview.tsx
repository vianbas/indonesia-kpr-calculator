import type { Preview } from '@storybook/react-vite';
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
    // Storybook 9+ keys backgrounds by id instead of taking a `values` array,
    // and the active one is picked through `initialGlobals` — the old
    // `backgrounds.default` parameter is no longer read at runtime.
    backgrounds: {
      options: {
        white: { name: 'White', value: '#ffffff' },
        'gray-50': { name: 'Gray 50', value: '#f9fafb' },
        dark: { name: 'Dark', value: '#1f2937' },
      },
    },
    docs: {
      toc: true,
    },
  },
  initialGlobals: {
    backgrounds: { value: 'gray-50' },
  },
  tags: ['autodocs'],
};

export default preview;
