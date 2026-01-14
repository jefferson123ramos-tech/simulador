
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permite que o código acesse process.env.API_KEY no navegador
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          gemini: ['@google/genai'],
        },
      },
    },
  },
});
