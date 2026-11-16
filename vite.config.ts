import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Everything the app loads is same-origin, so the policy can be strict. Styles
// keep 'unsafe-inline' for the loading placeholder in index.html. Build-only:
// the dev server injects an inline script for hot reload. `frame-ancestors`
// has no effect in a <meta> tag; set it as a header on the host if it supports one.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const WORKER_DEV = 'http://127.0.0.1:8787'

function contentSecurityPolicy(): Plugin {
  return {
    name: 'sija-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    // Offline-first: the app shell, every route chunk, the lexicon, sentences,
    // lessons and the font are precached. No core content needs the network.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Sija — Finnish Noun Lab',
        short_name: 'Sija',
        description: 'Learn Finnish noun grammar: cases, stems, consonant gradation, -i nouns and plurals — with the reason behind every form.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1f5f99',
        background_color: '#f6f7f4',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        navigateFallback: '/index.html',
        // The sync API is never answered with the app page, or from the cache.
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // `npm run dev` forwards the sync API to `npm run worker:dev`. The Worker only
  // accepts changes whose Origin is its own, so the proxy presents that origin.
  server: {
    proxy: {
      '/api': {
        target: WORKER_DEV,
        changeOrigin: true,
        configure: (proxy) => proxy.on('proxyReq', (req) => req.setHeader('origin', WORKER_DEV)),
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Engine and data tests run in plain Node; component tests opt into jsdom
    // with a `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    // worker/: the sync API, run in Miniflare (the local Workers runtime) with a local D1.
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
