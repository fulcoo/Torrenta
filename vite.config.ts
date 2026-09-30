import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
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
    host: '127.0.0.1',
    port: 3000,
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
  },
  test: {
    environment: 'jsdom',
  }
} as any)

