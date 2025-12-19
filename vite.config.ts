import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'date-fns'],
          // Chart library (large, only used in Dashboard)
          'vendor-charts': ['recharts'],
          // Flow builder (large, only used in FlowBuilder)
          'vendor-flow': ['reactflow'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size warning limit to 600KB
    chunkSizeWarningLimit: 600,
    // Enable source maps for better debugging
    sourcemap: false,
  },
});