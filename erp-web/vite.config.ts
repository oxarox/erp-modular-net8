/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // 5173 no es casual: es el origen que docker-compose.yml ya declara en
    // Cors__OrigenesPermitidos__0. Cambiarlo obliga a tocar el backend.
    port: 5173,
    strictPort: true,
  },

  // La app se sirve bajo una subruta cuando se publica en GitHub Pages
  // (usuario.github.io/erp-modular-net8/). En local y en Vercel es '/'.
  base: process.env.VITE_BASE ?? '/',

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/configuracion-pruebas.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/simulacion/**', 'src/main.tsx'],
    },
  },
})
