/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Split React + ReactDOM into a stable vendor chunk.
    // React changes rarely, so this chunk stays cached across app deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // The PDF export chunk (jsPDF + html2canvas) is ~430 kB uncompressed and
    // intentionally lazy — raise the warning threshold to avoid false noise.
    chunkSizeWarningLimit: 600,
  },

  test: {
    globals: true,
    environment: 'node',
    // UI integration tests run in jsdom; domain/application tests stay in node
    environmentMatchGlobs: [['src/ui/**', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
