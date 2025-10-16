// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config for Gryadka frontend
 *
 * Notes:
 * - Production site: https://gryadka.tech
 * - base is '/' because site is served from root of domain.
 * - Dev server proxies requests starting with /api to backend running on 127.0.0.1:8000.
 *   Adjust proxy.target if your backend runs on another port/host.
 *
 * Important about cookies & auth:
 * - Your backend uses refresh token via httponly cookie (credentials: include).
 *   During local dev (localhost) the cookie domain set by backend (gryadka.tech) won't match,
 *   so browser will not accept the cookie unless backend sets cookie domain to localhost or
 *   you run the frontend under gryadka.tech (e.g. with /etc/hosts + https).
 * - For development convenience you can set backend to issue cookies without domain
 *   or run a dev reverse-proxy that maps gryadka.tech -> local backend.
 *
 * If you want to change the API origin dynamically, use an env var VITE_API_BASE in .env
 * and reference import.meta.env.VITE_API_BASE from the app.
 */

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    base: "/",
    plugins: [react()],
    server: {
      host: true,         // listen on all network interfaces (useful if testing from other devices)
      port: 5173,
      // Proxy API calls to your backend during development.
      // When deployed to production, the frontend will be served from gryadka.tech
      // and should call the real backend (example: https://gryadka.tech/api or proxied by nginx).
      proxy: {
        // Proxy any request starting with /api to the backend.
        // Adjust `target` to your local backend address/port.
        "/api": {
			  target: "http://127.0.0.1:8000",
			  changeOrigin: true,
			  secure: false,
			  ws: false,
			  // добавьте эту строку:
			  cookieDomainRewrite: { "*": "localhost" }
			},
        // If your minio or media uses a separate path you want proxied (optional):
        // "/minio": {
        //   target: "http://127.0.0.1:9000",
        //   changeOrigin: true,
        //   secure: false
        // }
      }
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
      // you can tune terser / minify here if desired
      // minify: 'esbuild',
    },
    preview: {
      port: 5173
    },
    // Optionally expose env prefix so you can use import.meta.env.VITE_*
    // (Vite does this by default for VITE_ prefixed vars)
    define: {
      // small helper to embed production domain if needed
      __PROD_DOMAIN__: JSON.stringify(isDev ? "http://localhost:5173" : "https://gryadka.tech")
    }
  };
});
