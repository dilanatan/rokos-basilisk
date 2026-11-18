import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const target = process.env.API_URL || 'http://localhost:3001';
const proxy = { '/api': target, '/mcp': target };
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, proxy, fs: { strict: true } },
  preview: { host: '127.0.0.1', proxy },
});
