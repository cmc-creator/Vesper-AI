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
          // React core must be isolated first so vendor-three (R3F) doesn't bundle React internals,
          // which would cause circular initialization TDZ against the main bundle.
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/') || id.includes('node_modules/react-reconciler/')) return 'vendor-react';
          if (id.includes('node_modules/@react-three') || id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/@codesandbox') || id.includes('node_modules/sandpack')) return 'vendor-sandpack';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-recharts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) return 'vendor-monaco';
          // react-syntax-highlighter and react-markdown: isolated to prevent Ii TDZ.
          // These are sync-imported but are standalone (no circular deps with main bundle).
          if (id.includes('node_modules/react-syntax-highlighter') || id.includes('node_modules/prismjs') || id.includes('node_modules/highlight.js') || id.includes('node_modules/refractor')) return 'vendor-syntax';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/micromark') || id.includes('node_modules/mdast') || id.includes('node_modules/remark') || id.includes('node_modules/unified') || id.includes('node_modules/hast') || id.includes('node_modules/vfile')) return 'vendor-markdown';
          // NOTE: @dnd-kit and react-hotkeys-hook are sync-imported in App.jsx.
          // Do NOT put them in separate chunks - that causes circular TDZ with main bundle.
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
      'react-syntax-highlighter',
      'react-markdown',
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
