import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = process.env.API_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/monitors': { target: API, changeOrigin: true },
      '/checks':   { target: API, changeOrigin: true },
      '/health':   { target: API, changeOrigin: true },
      '/metrics':  { target: API, changeOrigin: true },
      '/stats':    { target: API, changeOrigin: true },
    }
  }
})
