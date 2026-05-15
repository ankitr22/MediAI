import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // bind to 0.0.0.0 — needed inside Docker
    port: 5173,
    proxy: {
      '/auth':     { target: 'http://localhost:8000', changeOrigin: true },
      '/rag':      { target: 'http://localhost:8000', changeOrigin: true },
      '/skin':     { target: 'http://localhost:8000', changeOrigin: true },
      '/patients': { target: 'http://localhost:8000', changeOrigin: true },
    }
  }
})
