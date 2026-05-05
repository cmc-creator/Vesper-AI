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
          // IMPORTANT: Only packages that are lazy-loaded (React.lazy) should go here.
          // Sync-imported packages MUST stay in the main bundle or their initialization
          // order will produce TDZ errors.
          //
          // vendor-react: DO NOT add. React must stay in main bundle so that sync deps
          //   (framer-motion, @dnd-kit, react-hotkeys-hook) can all reference the same
          //   React instance without circular init issues.
          //
          // Exact original patterns restored for vendor-three to avoid xr TDZ:
          if (id.includes('@react-three') || (id.includes('node_modules/three') && !id.includes('sandpack'))) return 'vendor-three';
          if (id.includes('@codesandbox/sandpack') || id.includes('sandpack-react') || id.includes('sandpack-themes')) return 'vendor-sandpack';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-recharts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
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
      'three', '@react-three/fiber', '@react-three/drei',
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
