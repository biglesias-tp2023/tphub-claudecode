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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['d3'],
          'vendor-export': ['jspdf', 'jspdf-autotable', 'xlsx'],
        },
      },
    },
  },
})
