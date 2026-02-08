import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true, // Enable network access
    port: 5174,
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber'],
          ui: ['@mui/material', '@mui/icons-material']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
