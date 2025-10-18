// src/api.js
// Универсальный клиент для фронтенда: fetchWithAuth + API helpers + image fetch fallback.

// Базовый URL API
const API_ROOT = "/api";
// Объект с конечными точками API
export const ENDPOINTS = {
  LOGIN: `${API_ROOT}/auth/login`,
  REGISTER: `${API_ROOT}/auth/register`,
  REFRESH: `${API_ROOT}/auth/refresh`,
  LOGOUT: `${API_ROOT}/auth/logout`,
  PRODUCTS: `${API_ROOT}/products`,
  FARMS: `${API_ROOT}/farms`,
  ME: `${API_ROOT}/users/me`,
};

// Ключ для хранения токена доступа в localStorage
const ACCESS_TOKEN_KEY = "gryadka_access_token";

// Сохранение токена доступа в localStorage
export function saveAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}
// Чтение токена доступа из localStorage
export function readAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * fetchWithAuth:
 * - добавляет Authorization: Bearer <token> (если есть) и credentials: 'include'
 * - при получении 401 пытается один раз сделать refresh (POST /auth/refresh, credentials: include)
 *   и повторить запрос с новым access_token (если refresh вернул новый access_token).
 *
 * Возвращает Response (как fetch).
 */
export async function fetchWithAuth(url, init = {}, allowRetry = true) {
  const token = readAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const cfg = { ...init, credentials: "include", headers };

  let res;
  try {
    res = await fetch(url, cfg);
  } catch (err) {
    throw err;
  }

  if (res.status === 401 && allowRetry) {
    // Попытка обновления токена через cookie (httponly refresh)
    try {
      const r = await fetch(ENDPOINTS.REFRESH, { method: "POST", credentials: "include" });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        const newToken = j && j.access_token;
        if (newToken) {
          saveAccessToken(newToken);
          // повторим исходный запрос с новым токеном, но без дальнейших попыток
          const headers2 = new Headers(init.headers || {});
          headers2.set("Authorization", `Bearer ${newToken}`);
          const cfg2 = { ...init, credentials: "include", headers: headers2 };
          return fetch(url, cfg2);
        }
      } else {
        // refresh провалился — очистим access token
        saveAccessToken(null);
      }
    } catch (e) {
      // игнорируем ошибки сети при обновлении токена — вернём первоначальный 401
    }
  }

  return res;
}

/**
 * Вспомогательная функция: выполнение JSON-запроса с аутентификацией (возвращает { ok, status, data })
 */
async function _fetchJson(url, init = {}) {
  const res = await fetchWithAuth(url, init);
  const j = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: j };
}

/* ---------- auth ---------- */
// Логин пользователя
export async function login(payload) {
  // payload: { email, password }
  const res = await fetch(ENDPOINTS.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  const j = await res.json().catch(() => null);
  // ожидаем { access_token: "..." } и httponly refresh cookie
  if (res.ok && j && j.access_token) {
    saveAccessToken(j.access_token);
  }
  return { ok: res.ok, status: res.status, data: j };
}

// Регистрация пользователя
export async function register(payload) {
  const res = await fetch(ENDPOINTS.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  const j = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: j };
}

// Выход пользователя
export async function logout() {
  // вызов logout, ожидаем что бэкенд почистит refresh cookie
  try {
    const res = await fetch(ENDPOINTS.LOGOUT, { method: "POST", credentials: "include" });
    saveAccessToken(null);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    saveAccessToken(null);
    return { ok: false, status: 0 };
  }
}

// Получение данных текущего пользователя
export async function getMe() {
  return _fetchJson(ENDPOINTS.ME, { method: "GET" });
}

/* ---------- products ---------- */
// Получение списка продуктов
export async function getProducts({ q = "", limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (q) params.set("q", q);
  const url = `${ENDPOINTS.PRODUCTS}?${params.toString()}`;
  return _fetchJson(url, { method: "GET" });
}

// Получение списка продуктов текущего пользователя
export async function getMyProducts() {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/me`, { method: "GET" });
}

// Получение продукта по ID
export async function getProduct(id) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "GET" });
}

// Создание продукта
export async function createProduct(payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

// Обновление продукта
export async function updateProduct(id, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

// Удаление продукта
export async function deleteProduct(id) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

/* ---------- media ---------- */
// Подтверждение загрузки медиа
export async function confirmMediaUpload(productId, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/media/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// Прямая загрузка медиа для продукта
export async function uploadProductMediaDirect(productId, file, is_primary = false) {
  const formData = new FormData();
  formData.append("file", file);
  if (is_primary) formData.append("is_primary", "1");
  
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/upload`, { 
    method: "PUT", 
    body: formData 
  });
  
  const j = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: j };
}

// Удаление медиа продукта
export async function deleteProductMedia(productId, mediaId) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/${mediaId}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

/**
 * Попытка загрузки изображения с авторизацией и возврат objectURL.
 * - возвращает строку objectURL при успехе
 * - возвращает null при любой ошибке (403/401/other)
 *
 * Вызывающий должен вызвать URL.revokeObjectURL, когда objectURL больше не нужен.
 */
export async function fetchImageAsObjectURL(url) {
  try {
    const token = readAccessToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // credentials: include для разрешения сессий на основе cookie / обновления cookie при необходимости
    const res = await fetch(url, { method: "GET", credentials: "include", headers });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

/* ---------- farms & passport helpers ---------- */
// Получение ферм
export async function getFarms() {
  return _fetchJson(ENDPOINTS.FARMS, { method: "GET" });
}
// Создание фермы
export async function createFarm(payload) {
  return _fetchJson(ENDPOINTS.FARMS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

// Создание/обновление паспорта продукта
export async function upsertPassport(productId, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
// Получение паспорта продукта
export async function getPassport(productId) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, { method: "GET" });
}
