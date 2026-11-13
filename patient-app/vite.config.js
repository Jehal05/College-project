// Vite setup: React plus an installable PWA whose service worker keeps the app shell available offline.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Content-Security-Policy for the built app: only our own files, plus the API and live-events addresses from the environment.
// Not applied in `npm run dev` (the dev server needs inline scripts).
function contentSecurityPolicy(env) {
  const api = new URL(env.VITE_API_URL || 'http://localhost:4000');
  const ws = new URL(env.VITE_WS_URL || api.origin.replace(/^http/, 'ws') + '/ws');
  const connect = ["'self'", api.origin, ws.origin].join(' ');
  const policy = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    'connect-src ' + connect, "font-src 'self' data:", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'"].join('; ');
  return {
    name: 'html-csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<!--CSP-->', '<meta http-equiv="Content-Security-Policy" content="' + policy + '" />'),
  };
}

export default defineConfig(({ mode }) => ({
  server: { port: 5173 },
  plugins: [
    react(),
    contentSecurityPolicy(loadEnv(mode, process.cwd(), '')),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The app files are cached so a visited page opens offline. API calls are never cached here
        // (health data stays out of browser caches; see utils/offlineCache.js for the in-tab saved copies).
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Screens that only work with the server (passport, reminders, summary, demo panel) and the QR library are loaded the
        // first time they are opened and then kept by the runtime rule below. This keeps the offline install small.
        globIgnores: ['**/assets/{browser,Passport,PassportView,Reminders,Summary,DemoTools}-*.js'],
        runtimeCaching: [{
          urlPattern: ({ url }) => /\/assets\/(browser|Passport|PassportView|Reminders|Summary|DemoTools)-[^/]+\.js$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'ht-server-screens', expiration: { maxEntries: 12 } },
        }],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'HealthTwin AI',
        short_name: 'HealthTwin',
        description: 'Simulated emergency response prototype. Not a medical device.',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
}));
