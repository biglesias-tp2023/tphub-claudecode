import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Silence chunk size warnings - main bundle is ~960KB due to lucide-react, xlsx, jspdf
    // These are already lazy-loaded where possible, acceptable for internal portal
    chunkSizeWarningLimit: 1000,
  },
})
