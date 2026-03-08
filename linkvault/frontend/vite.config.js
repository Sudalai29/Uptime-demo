import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // In local dev, proxy /links and /health to FastAPI running on 8000
      '/links': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    }
  },
  build: {
    outDir: 'dist',
  }
})
