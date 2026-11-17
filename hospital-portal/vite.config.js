import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE is '/portal/' in the one-address build (everything on one server), '/' otherwise.
export default defineConfig({
  base: process.env.PORTAL_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5174 }, // 5173 is left free for Jehal's patient app
});
