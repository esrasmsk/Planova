import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Mobil (Capacitor) derlemesi: yalnizca arayuz (renderer) derlenir, dist-mobil'e yazilir.
 * Veri katmani burada src/renderer/src/api/mobilApi.ts (SQLite); Electron main/preload dahil edilmez.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src/renderer/src') }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-mobil'),
    emptyOutDir: true
  }
})
