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
          // RULE: Only list packages here that are (a) ONLY loaded via React.lazy
          // AND (b) do NOT contain a React reconciler / scheduler that could fire
          // callbacks into the main bundle before cr/cn are initialized.
          //
          // DO NOT add:
          //   vendor-react     - React must stay in main bundle
          //   vendor-motion    - framer-motion sync-imported in App.jsx
          //   vendor-three     - @react-three/fiber has its own React reconciler;
          //                      naming it causes scheduler callbacks to fire before
          //                      main bundle cr/cn are initialized. Let Rollup
          //                      auto-chunk it alongside the Canvas/KnowledgeGraph
          //                      lazy components.
          //   vendor-syntax / vendor-markdown - removed (now lazy via MessageContent)
          if (id.includes('@codesandbox/sandpack') || id.includes('sandpack-react') || id.includes('sandpack-themes')) return 'vendor-sandpack';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-recharts';
          // framer-motion is NOT chunked: it's sync-imported in App.jsx, so splitting it
          // creates a circular chunk dep (vendor-motion → React in main bundle → vendor-motion),
          // which causes TDZ on const cr/cn. Keep framer-motion in the main bundle.
          if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) return 'vendor-monaco';
          // NOTE: react-syntax-highlighter and react-markdown are NOT listed here.
          // They are now only loaded lazily via MessageContent (React.lazy), so Rollup
          // will auto-chunk them as async chunks. Forcing them into named manualChunks
          // while they have no sync import path from App.jsx shifts the main bundle's
          // module evaluation order and causes the cn TDZ from vendor-three.
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom',
      // three/@react-three removed from optimizeDeps - let Rollup auto-chunk them
      // alongside Canvas/KnowledgeGraph lazy components to avoid R3F reconciler TDZ
      '@codesandbox/sandpack-react',
      'recharts',
      'framer-motion',
      '@monaco-editor/react',
      // react-syntax-highlighter and react-markdown removed - they are lazy-only now
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
