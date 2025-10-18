// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Конфигурация Vite для фронтенда Gryadka
 */
export default defineConfig(({ mode }) => {
  // Определение режима разработки
  const isDev = mode === "development";

  return {
    // Базовый путь для ресурсов
    base: "/",
    // Подключаем плагин для React
    plugins: [react()],
    server: {
      // Разрешаем серверу слушать на всех адресах
      host: true,
      // Порт для разработки
      port: 5173,
      // Прокси API запросов в режиме разработки
      proxy: isDev ? {
        "/api": {
          // Целевой бэкенд сервер
          target: "http://127.0.0.1:8000",
          // Изменяем заголовок origin при проксировании
          changeOrigin: true,
          // Отключаем проверку SSL сертификатов
          secure: false,
          // Отключаем проксирование вебсокетов
          ws: false,
          // Перезаписываем домен в куках
          cookieDomainRewrite: { "*": "localhost" }
        }
      } : undefined
    },
    build: {
      // Каталог для сборки
      outDir: "dist",
      // Отключаем sourcemap
      sourcemap: false,
      rollupOptions: {
        output: {
          // Разделение бандла на чанки
          manualChunks(id) {
            // Выносим зависимости из node_modules в отдельный чанк vendor
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        }
      },
    },
    preview: {
      // Порт для предварительного просмотра сборки
      port: 5173,
      // Прокси API запросов при предварительном просмотре
      proxy: {
        "/api": {
          // Целевой сервер для прода
          target: "https://gryadka.tech  ",
          // Изменяем заголовок origin при проксировании
          changeOrigin: true,
          // Включаем проверку SSL сертификатов
          secure: true
        }
      }
    }
  };
});
