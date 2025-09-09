import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react()],
    base: isProduction ? '/sistema-kg-amor-frontend/' : '/',
    build: {
      outDir: 'dist'
    },
    server: {
      port: 3000,
      host: true
    }
  }
})
