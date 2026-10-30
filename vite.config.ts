import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve el sitio en /<repo>/; el workflow define BASE_PATH
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        // Motor, modos y stores: TS sin DOM
        extends: true,
        test: {
          name: 'engine',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup/storage.ts'],
        },
      },
      {
        // Componentes React
        extends: true,
        test: {
          name: 'components',
          include: ['tests/components/**/*.test.tsx', 'src/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
      {
        // Tests lentos (generación masiva): `npm run test:slow`
        extends: true,
        test: {
          name: 'slow',
          include: ['tests/**/*.slow.ts'],
          environment: 'node',
          testTimeout: 120_000,
        },
      },
    ],
  },
})
