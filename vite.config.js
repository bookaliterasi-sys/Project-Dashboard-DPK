import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ExcelJS (dipakai untuk generate template Excel di browser) mereferensikan
// beberapa global Node. Definisikan agar tidak error saat runtime di browser.
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: { chunkSizeWarningLimit: 1600 },
})
