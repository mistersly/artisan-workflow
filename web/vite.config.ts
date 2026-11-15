import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // The compose e2e service reaches the dev server via http://web:5173.
    allowedHosts: ["web"],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8180",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8180",
        changeOrigin: true,
      },
    },
  },
})
