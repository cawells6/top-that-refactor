// vite.config.ts
import path from 'path'; // Node.js path module

import { defineConfig } from 'vite';

export default defineConfig({
  // Set the 'public' directory as the root for Vite's dev server
  // and the source for static assets like index.html.
  root: path.resolve(__dirname, 'public'),

  // Configure the development server
  server: {
    port: 5173, // Port for the Vite client-side dev server (changed from 8080 to 5173)
    open: false, // Set to true if you want Vite to open the browser automatically
    proxy: {
      // Proxy WebSocket requests for Socket.IO to your backend Node.js server
      '/socket.io': {
        target: 'http://localhost:3002', // Your backend server address (running on port 3002)
        ws: true, // IMPORTANT: Enable WebSocket proxying
      },
      // Example for other backend API routes if you add them later:
      // '/api': {
      //   target: 'http://localhost:3000',
      //   changeOrigin: true, // Recommended for virtual hosted sites
      //   rewrite: (path) => path.replace(/^\/api/, '') // Optional: if you need to rewrite the path
      // }
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

  // Optional: Configure path aliases for cleaner imports (can be set up later if needed)
  // resolve: {
  //   alias: {
  //     // Example: Allows `import X from '@/components/X'`
  //     '@': path.resolve(__dirname, 'public/scripts'),
  //     // Example: Allows `import { MyType } from '@shared/types'`
  //     '@shared': path.resolve(__dirname, 'src/shared'),
  //   },
  // },
});
