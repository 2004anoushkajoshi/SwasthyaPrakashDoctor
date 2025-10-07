// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fix for "Identifier 'React' has already been declared" error
      babel: {
        parserOpts: {
          plugins: ['jsx'], // Ensure JSX parsing is properly configured
          allowReturnOutsideFunction: true
        }
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Add these optimizations for better error handling
  optimizeDeps: {
    include: ['react', 'react-dom', 'jspdf']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})