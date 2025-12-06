export const ENDPOINTS = {
  API_ROOT: "/api",
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  REFRESH: "/api/auth/refresh",
  LOGOUT: "/api/auth/logout",
  PRODUCTS: "/api/products",
  FARMS: "/api/farms",
  ME: "/api/users/me",
};


const ACCESS_TOKEN_KEY = "gryadka_access_token";

export function saveAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}
export function readAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

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
        saveAccessToken(null);
      }
    } catch (e) {
    }
  }

  return res;
}

async function _fetchJson(url, init = {}) {
  const res = await fetchWithAuth(url, init);
  const j = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function login(payload) {
  const res = await fetch(ENDPOINTS.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  const j = await res.json().catch(() => null);
  if (res.ok && j && j.access_token) {
    saveAccessToken(j.access_token);
  }
  return { ok: res.ok, status: res.status, data: j };
}

export async function register(payload) {
  const res = await fetch(ENDPOINTS.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  const j = await res.json().catch(() => null);
  if (res.ok && j && j.access_token) {
    saveAccessToken(j.access_token);
  }
  return { ok: res.ok, status: res.status, data: j };
}

export async function logout() {
  try {
    const res = await fetch(ENDPOINTS.LOGOUT, { method: "POST", credentials: "include" });
    saveAccessToken(null);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    saveAccessToken(null);
    return { ok: false, status: 0 };
  }
}

export async function getMe() {
  return _fetchJson(ENDPOINTS.ME, { method: "GET" });
}

export async function getProducts({ q = "", limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (q) params.set("q", q);
  
  const url = `${ENDPOINTS.PRODUCTS}?${params.toString()}`;
  return _fetchJson(url, { method: "GET" });
}

export async function getMyProducts() {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/me`, { method: "GET" });
}

export async function getProduct(id) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "GET" });
}

export async function createProduct(payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function updateProduct(id, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function deleteProduct(id) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

export async function confirmMediaUpload(productId, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/media/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

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

export async function deleteProductMedia(productId, mediaId) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/${mediaId}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

export async function fetchImageAsObjectURL(url) {
  try {
    const token = readAccessToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(url, { method: "GET", credentials: "include", headers });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

export async function getFarms() {
  return _fetchJson(ENDPOINTS.FARMS, { method: "GET" });
}
export async function createFarm(payload) {
  return _fetchJson(ENDPOINTS.FARMS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function upsertPassport(productId, payload) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export async function getPassport(productId) {
  return _fetchJson(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, { method: "GET" });
}
