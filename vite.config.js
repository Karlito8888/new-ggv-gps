import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { qrcode } from "vite-plugin-qrcode";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  publicDir: "public",
  base: "/", // Important for Netlify
  build: {
    outDir: "dist",
    sourcemap: false, // Disable for production
    target: "modules", // Optimize for modern smartphones
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
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
  plugins: [react(), qrcode()],
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
