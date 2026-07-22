import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/SINTER-PAMONG/',
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    host: true, // Expose to local network
    allowedHosts: true, // Allow ngrok and other external tunnels
    cors: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('react-router-dom') || id.includes('react-router')) {
              return 'react-router';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
