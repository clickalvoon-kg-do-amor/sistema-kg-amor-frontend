import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Usar base apenas em produção (GitHub Pages)
  base: process.env.NODE_ENV === 'production' ? '/sistema-kg-amor-frontend/' : '/',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    host: true
  }
})