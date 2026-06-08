import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [commonjs(), react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3008',
      '/uploads': 'http://localhost:3008',
    },
  },
});
