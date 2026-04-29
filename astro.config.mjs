import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind(),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Refugio Rosa',
        short_name: 'Refugio',
        description: 'Una aplicación minimalista de bienestar',
        theme_color: '#FFF0F5',
        background_color: '#FFF0F5',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
