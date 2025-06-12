// vite.config.ts
import path from 'path'; // Node.js path module

import { defineConfig } from 'vite';

export default defineConfig({
  // Set the 'public' directory as the root for Vite's dev server
  // and the source for static assets like index.html.
  root: path.resolve(__dirname, 'public'),

  // Configure the development server
  server: {
    port: 5173, // Port for the Vite client-side dev server
<<<<<<< HEAD
<<<<<<< HEAD
    open: true, // Automatically open browser on server start
=======
    open: 'firefox', // This tells Vite to open Firefox
>>>>>>> 822cdde (perfected run scripts)
=======
    open: 'firefox', // This tells Vite to open Firefox
>>>>>>> 822cdde (perfected run scripts)
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
        card: path.resolve(__dirname, 'public/card-test.html'),
      },
    },
  },

  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
