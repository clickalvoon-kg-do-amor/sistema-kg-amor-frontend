import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/sistema-kg-amor-frontend/' : '/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 3000,
  },
})
