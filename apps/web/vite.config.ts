import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` (serves the real dist/ build) doesn't share the dev
  // server's proxy config, but scripts/prerender.mjs needs it — pointed at
  // a real API origin (not localhost:3001) so the crawled pages have real
  // data. PRERENDER_API_ORIGIN unset means preview isn't being used for
  // prerendering, so fall back to the same local target as dev.
  preview: {
    proxy: {
      '/api': {
        target: process.env.PRERENDER_API_ORIGIN ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
