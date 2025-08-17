import { defineConfig } from 'vite'

export default defineConfig({
  base: '/piper-tts-web/',
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  optimizeDeps: {
    exclude: ['@realtimex/piper-tts-web']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
})
