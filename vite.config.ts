import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Ensure _redirects and other public assets are copied
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});