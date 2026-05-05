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
          // Isolate every heavy/circular-ESM package into its own async chunk.
          // This prevents TDZ errors caused by circular module initialization in the main bundle.
          if (id.includes('node_modules/@react-three') || id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/@codesandbox') || id.includes('node_modules/sandpack')) return 'vendor-sandpack';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-recharts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) return 'vendor-monaco';
          if (id.includes('node_modules/react-syntax-highlighter') || id.includes('node_modules/prismjs') || id.includes('node_modules/highlight.js')) return 'vendor-syntax';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/micromark') || id.includes('node_modules/mdast') || id.includes('node_modules/remark') || id.includes('node_modules/unified') || id.includes('node_modules/hast') || id.includes('node_modules/vfile')) return 'vendor-markdown';
          if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd';
          if (id.includes('node_modules/react-hotkeys-hook')) return 'vendor-hotkeys';
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
      '@dnd-kit/core',
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
