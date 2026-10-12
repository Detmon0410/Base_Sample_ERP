import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    // Playwright writes its videos, traces and downloads here while a test runs; watching them crashed the dev server (EBUSY on a .crdownload)
    watch: { ignored: ["**/e2e-results/**", "**/e2e-report/**"] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // The API tests run against the local mock (services/mock), exactly like the app in demo mode.
    env: { VITE_USE_MOCK: 'true' },
    css: false,
    exclude: ["**/node_modules/**", "e2e/**"], // e2e/ is Playwright (npm run e2e)
  },
})
