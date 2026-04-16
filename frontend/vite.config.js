import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Same-origin /api in dev → Spring Boot (avoids "Network Error" when using LAN URL or mixed host issues)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})

