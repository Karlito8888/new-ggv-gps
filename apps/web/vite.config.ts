/// <reference types="vite-plus/test" />
import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 1100, // MapLibre chunk is inherently ~1MB
    target: "esnext", // Optimize for modern smartphones
    modulePreload: {
      polyfill: false, // Modern browsers support modulepreload natively
    },
    rolldownOptions: {
      output: {
        hoistTransitiveImports: false,
        // Chunking strategy
        codeSplitting: {
          groups: [
            // Core React - small, always needed
            { name: "vendor", test: /node_modules\/react(-dom)?\// },
            // MapLibre + PMTiles JS - lazy loaded together. JS only: the CSS imported
            // statically by useMapSetup must stay out, or the entry imports this chunk eagerly.
            { name: "maps", test: /node_modules\/(maplibre-gl|pmtiles)\/.*\.js$/ },
          ],
        },
      },
    },
  },
  plugins: lazyPlugins(() => [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // autoUpdate, not "prompt": the app is entered by scanning a QR code at the village gate,
      // so nobody is going to tap an "Update" button before walking. With "prompt" the installed
      // PWA kept serving the previous precached bundle until someone did — measured, two
      // relaunches on a stale build. See the skipWaiting note in src/sw.ts.
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: [
          "**/*.{js,css,html}",
          "sprites/**/*.{json,png}",
          "icons/**/*.{png,webp}",
          "screenshots/**/*.webp",
          "fonts/**/*.woff2",
          "manifest.json",
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ]),
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
  test: {
    include: ["src/__tests__/**/*.test.ts"],
  },
});
