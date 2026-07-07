import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api/v2': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: 'http://127.0.0.1:8080',
          Referer: 'http://127.0.0.1:8080/',
        }
      }
    }
  }
} as any)

