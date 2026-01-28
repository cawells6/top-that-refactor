// vite.config.ts
import path from 'path'; // Node.js path module

import { defineConfig, type LogLevel } from 'vite';

export default defineConfig(({ mode }) => ({
  // Set the 'public' directory as the root for Vite's dev server
  // and the source for static assets like index.html.
  root: path.resolve(__dirname, 'public'),

  // Keep dev logs quiet by default.
  logLevel: (process.env.VITE_LOG_LEVEL || 'silent') as LogLevel,

  // Use a Vite-injected global for dev-only UI toggles (keeps Jest happy).
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
  },

  // Configure the development server
  server: {
    host: '0.0.0.0', // Allow access from other devices on the network
    port: 5173, // Port for the Vite client-side dev server
    // Let Vite auto-open by default (single window).
    // The `run` launcher sets `NO_AUTO_OPEN=1` for child processes to prevent double-open.
    open: process.env.NO_AUTO_OPEN ? false : true,
    cors: true, // Enable CORS for all origins
    hmr: {
      clientPort: 5173, // Ensure HMR uses the correct client port
    },
    proxy: {
      // Enhanced Socket.IO proxy configuration
      '/socket.io': {
        target: 'ws://localhost:3000', // Use WebSocket protocol explicitly
        ws: true, // Enable WebSocket proxying
        changeOrigin: true, // For virtual hosted sites
        secure: false, // Disable SSL certificate validation for dev
        rewrite: (path) => path, // Keep paths as-is
      },
      // Proxy for the Deck of Cards API
      '/cards-api': {
        target: 'https://deckofcardsapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cards-api/, ''),
      },
      // Example for other backend API routes if you add them later:
      // '/api': {
      //   target: 'http://localhost:3000',
      //   changeOrigin: true, // Recommended for virtual hosted sites
      //   rewrite: (path) => path.replace(/^\/api/, '') // Optional: if you need to rewrite the path
      // }
    },
    watch: {
      usePolling: true, // Needed for some systems/file systems
    },
  },

  // Configure the build process
  build: {
    // Output directory for the production build, relative to the project root.
    // This will create `dist/client/` in your project root.
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true, // Cleans the output directory before each build
    rollupOptions: {
      // Ensure index.html from the 'public' directory (Vite's root) is used as the input
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
      },
    },
  },

  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
}));
