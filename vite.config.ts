import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': root } },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    watch: { ignored: ['**/data/**', '**/node_modules/**'] },
  },
});
