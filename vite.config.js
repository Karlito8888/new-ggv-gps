import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  publicDir: "public",
  base: "/", // Important for Netlify
  esbuild: {
    drop: ["console", "debugger"], // Remove console.log and debugger in production
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable for production
    target: "esnext", // Optimize for modern smartphones
    cssCodeSplit: true, // Split CSS for better caching
    modulePreload: {
      polyfill: false, // Modern browsers support modulepreload natively
    },
    rollupOptions: {
      output: {
        // Improved chunking strategy for lazy loading
        manualChunks: (id) => {
          // Core React - small, always needed
          if (id.includes("node_modules/react-dom")) {
            return "vendor";
          }
          if (id.includes("node_modules/react/")) {
            return "vendor";
          }

          // MapLibre - large, lazy loaded
          if (id.includes("node_modules/maplibre-gl")) {
            return "maps";
          }

          // Supabase - medium, lazy loaded
          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }

          // Framer Motion - animations
          if (id.includes("node_modules/framer-motion")) {
            return "animations";
          }
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
});
