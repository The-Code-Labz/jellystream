import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/jellyfin': {
        target: process.env.VITE_JELLYFIN_URL || 'http://localhost:8096',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jellyfin/, ''),
      },
    },
  },
});
