import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';



const port = process.env.PORT ? Number(process.env.PORT) : 3000;

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    
    VitePWA({
      registerType: 'autoUpdate',
            manifestFilename: 'manifest.webmanifest',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-512x512-maskable.png'],
      manifest: {
        name: 'Atlas Study Tracker',
        short_name: 'Atlas',
        description: 'A personal progress tracker for students preparing for exams.',
        theme_color: '#121315',
        background_color: '#121315',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // Vercel picks up `dist` by default; Replit doesn't care about the name.
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
