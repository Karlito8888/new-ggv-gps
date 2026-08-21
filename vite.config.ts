/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  publicDir: "public",
  base: "/",
  build: {
    chunkSizeWarningLimit: 1100, // MapLibre chunk is inherently ~1MB
    target: "esnext", // Optimize for modern smartphones
    modulePreload: {
      polyfill: false, // Modern browsers support modulepreload natively
    },
    rolldownOptions: {
      output: {
        // Drop console.log and debugger in production
        hoistTransitiveImports: false,
        // Chunking strategy
        codeSplitting: {
          groups: [
            // Core React - small, always needed
            { name: "vendor", test: /node_modules\/react(-dom)?\// },
            // MapLibre + PMTiles - lazy loaded together
            { name: "maps", test: /node_modules\/(maplibre-gl|pmtiles)\// },
          ],
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
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
  ],
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
