import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  publicDir: "public",
  base: "/", // Important for Netlify
  build: {
    outDir: "dist",
    sourcemap: false, // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          maps: ["maplibre-gl", "ol"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // Optimized configuration for Netlify
      manifest: {
        name: "MyGGV|GPS",
        short_name: "MyGGV|GPS",
        description: "GPS for Garden Grove Village",
        theme_color: "#50AA61",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-16x16.png",
            sizes: "16x16",
            type: "image/png",
          },
          {
            src: "/icons/icon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "/icons/icon-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["navigation", "travel", "utilities"],
        lang: "fr-FR",
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2,jpg,jpeg}"],
        runtimeCaching: [
          // Critical files (NetworkFirst)
          {
            urlPattern: /\.(js|css|html)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "core-assets",
              networkTimeoutSeconds: 5,
            },
          },
          // Static assets cache
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          // OpenStreetMap tiles cache
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org/,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          // Supabase API cache with NetworkFirst
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },

      includeAssets: ["icons/*.png", "markers/*.png"],
      devOptions: {
        enabled: false, // Disabled for local development (avoids Workbox logs)
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
});;
