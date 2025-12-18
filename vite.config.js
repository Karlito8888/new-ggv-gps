import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  publicDir: "public",
  base: "/", // Important for Netlify
  esbuild: {
    drop: ["console", "debugger"], // Remove console.log and debugger in production
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable for production
    target: "esnext", // Optimize for modern smartphones
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          maps: ["maplibre-gl"],
          supabase: ["@supabase/supabase-js"],
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
