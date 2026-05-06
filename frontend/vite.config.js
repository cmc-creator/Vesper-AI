import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: false, // we have our own public/manifest.json
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/Vesper_Logo.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/vesper-backend-production.*\.up\.railway\.app\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'vesper-api', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // Enable network access
    port: 5173,
    proxy: {
      '/api': 'https://vesper-backend-production-b486.up.railway.app',
      '/media': 'https://vesper-backend-production-b486.up.railway.app',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // vendor-react: react + react-dom + scheduler must be one chunk so the
          // CJS→ESM wrapper for each evaluates together without cross-chunk TDZ.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'vendor-react';

          // vendor-mui: @mui/material barrel exports have internal circular ESM deps.
          // Isolating them in their own chunk means the entire MUI module graph
          // evaluates to completion before the index chunk (App) runs.
          // @emotion is a peer dep of MUI and must live in the same chunk.
          if (
            id.includes('/node_modules/@mui/') ||
            id.includes('/node_modules/@emotion/')
          ) return 'vendor-mui';

          // vendor-framer: framer-motion is sync-imported; isolate to prevent any
          // framer-internal circular dep from bleeding into the index chunk.
          if (id.includes('/node_modules/framer-motion')) return 'vendor-framer';

          // vendor-firebase: firebase + @firebase have their own circular graph.
          if (
            id.includes('/node_modules/firebase') ||
            id.includes('/node_modules/@firebase')
          ) return 'vendor-firebase';
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
