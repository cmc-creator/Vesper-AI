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
          // ROOT CAUSE of recurring TDZ (cr/cn/gr before initialization):
          // Rollup auto-creates a shared chunk for @react-three/fiber deps. Because
          // @react-three/fiber uses react-reconciler (which shares code with react-dom),
          // Rollup co-locates react-dom INTO that auto-chunk. main.jsx needs react-dom
          // synchronously, so it gets a SYNC import edge to the vendor-three chunk.
          // When vendor-three evaluates, R3F's reconciler boots and calls back into the
          // main bundle before its consts (cr/cn/gr) are initialized → TDZ crash.
          //
          // FIX: Pin react + react-dom + scheduler into a dedicated 'vendor-react' chunk.
          // - Main bundle gets a static import to vendor-react (loads vendor-react FIRST)
          // - vendor-react has NO back-references to the main bundle (no circular dep)
          // - @react-three auto-chunk imports React from vendor-react (already initialized)
          // - By the time any lazy component renders, all consts in main bundle are set
          //
          // Packages that MUST stay in vendor-react (sync deps of main.jsx / App.jsx):
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'vendor-react';

          // Lazy-only packages (safe to chunk because they never load synchronously):
          if (id.includes('@codesandbox/sandpack') || id.includes('sandpack-react') || id.includes('sandpack-themes')) return 'vendor-sandpack';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-recharts';
          if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) return 'vendor-monaco';
          // framer-motion: sync-imported in App.jsx → stays in main bundle (no entry here)
          // @react-three: lazy-only → Rollup auto-chunks alongside KnowledgeGraph/AvatarStudio
          // react-markdown / react-syntax-highlighter: lazy-only via MessageContent (no entry)
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom',
      '@codesandbox/sandpack-react',
      'recharts',
      'framer-motion',
      '@monaco-editor/react',
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
