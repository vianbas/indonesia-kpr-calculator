/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const hasSentryToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

  return {
    base: process.env.VITE_BASE_PATH ?? '/',
    plugins: [
      react(),
      // Upload source maps to Sentry only during production builds when the
      // auth token is present. Never runs during `npm run dev`.
      ...(isBuild && hasSentryToken
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                // Delete .map files from dist after upload so they are never
                // served publicly from the final Docker image.
                filesToDeleteAfterUpload: ['./dist/**/*.js.map'],
              },
            }),
          ]
        : []),
    ],

    build: {
      // Generate source maps for production — uploaded to Sentry and then
      // deleted from dist/ by the plugin above.
      sourcemap: true,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@sentry')) return 'vendor-sentry';
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },

    test: {
      globals: true,
      environment: 'node',
      environmentMatchGlobs: [['src/ui/**', 'jsdom']],
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
})
