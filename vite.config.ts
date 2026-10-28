import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
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
    ],
  },
})
