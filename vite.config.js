import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    base: "/",
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      host: true,
      port: 5173,
      proxy: isDev ? {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
          ws: false,
          cookieDomainRewrite: { "*": "localhost" }
        }
      } : undefined
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        }
      },
    },
    preview: {
      port: 5173,
      proxy: {
        "/api": {
          target: "https://gryadka.tech  ",
          changeOrigin: true,
          secure: true
        }
      }
    }
  };
});