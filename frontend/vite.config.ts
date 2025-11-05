import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // Esta é a única linha 'base' que você precisa
  plugins: [react()],
  // A linha de base duplicada e errada foi removida daqui
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 3000,
  },
})