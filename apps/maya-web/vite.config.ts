import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@maya/rl-core': path.resolve(__dirname, '..', '..', 'packages', 'rl-core', 'src'),
      '@maya/workspace-domain': path.resolve(__dirname, 'src', 'domain')
    }
  },
  build: {
    // Disable source maps in production for smaller bundles
    sourcemap: false,
    // Use esbuild for fast minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundle (drops IE11, old Safari)
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Inline assets smaller than 4kb (reduces HTTP requests)
    assetsInlineLimit: 4096,
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // React core and router - rarely changes, must be together
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Canvas library - stable, cache long
          if (id.includes('node_modules/konva') || id.includes('node_modules/react-konva')) {
            return 'vendor-konva';
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          // Utility libraries
          if (id.includes('node_modules/clsx') || id.includes('node_modules/polygon-clipping')) {
            return 'vendor-utils';
          }
          // Icons - load separately for tree-shaking
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Keep other node_modules together
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Compact output for smaller files
        compact: true,
      },
      // Tree-shaking configuration
      treeshake: {
        // More aggressive tree-shaking
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
      },
    },
    // Chunk size warning threshold (in KB)
    chunkSizeWarningLimit: 300,
    // Report compressed size (what users actually download)
    reportCompressedSize: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'konva', 'react-konva'],
    // Exclude TensorFlow from web bundle (only used in training scripts)
    exclude: ['@tensorflow/tfjs'],
  },
  // Web Worker configuration
  worker: {
    format: 'es',
  },
  // Enable esbuild optimizations
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Legal comments to separate file (reduces main bundle)
    legalComments: 'none',
  },
  // Preview server compression (for testing)
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
})
