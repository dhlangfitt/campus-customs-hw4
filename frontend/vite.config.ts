import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api and /media are proxied to FastAPI so the app is a single origin in dev —
// product photos and fetches need no absolute URLs.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    },
  },
})
