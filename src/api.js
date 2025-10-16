// src/api.js
const API_ROOT = "/api";
export const ENDPOINTS = {
  LOGIN: `${API_ROOT}/auth/login`,
  REGISTER: `${API_ROOT}/auth/register`,
  REFRESH: `${API_ROOT}/auth/refresh`,
  LOGOUT: `${API_ROOT}/auth/logout`,
  PRODUCTS: `${API_ROOT}/products`,
  FARMS: `${API_ROOT}/farms`,
  ME: `${API_ROOT}/users/me`
};

const ACCESS_TOKEN_KEY = "gryadka_access_token";

export function saveAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}
export function readAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function upsertPassport(productId, payload) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}
export async function getPassport(productId) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/passport`, { method: "GET" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}
/**
 * fetchWithAuth - wrapper that attaches Bearer token and tries refresh once on 401
 * init may include headers, body, method, etc.
 */
export async function fetchWithAuth(url, init = {}, allowRetry = true) {
  const token = readAccessToken(); // предполагается, что у вас есть такая функция
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // гарантируем credentials: 'include' (если используете cookie refresh)
  const cfg = { ...init, credentials: "include", headers };

  let res;
  try {
    res = await fetch(url, cfg);
  } catch (err) {
    // сетевые ошибки пробрасываем дальше
    throw err;
  }

  // при 401 пробуем refresh (один раз)
  if (res.status === 401 && allowRetry) {
    try {
      const r = await fetch(ENDPOINTS.REFRESH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        if (j && j.access_token) {
          saveAccessToken(j.access_token); // предполагается такая функция
          headers.set("Authorization", `Bearer ${j.access_token}`);
          const cfg2 = { ...cfg, headers };
          res = await fetch(url, cfg2);
        } else {
          // refresh не дал токен — очищаем локальное хранилище
          saveAccessToken(null);
        }
      } else {
        saveAccessToken(null);
      }
    } catch (e) {
      // refresh упал — ничего не делаем, вернём первоначальный 401
    }
  }

  return res;
}

/* ---------- Auth ---------- */
export async function login({ email, password }) {
  const res = await fetch(ENDPOINTS.LOGIN, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function register({ email, password, first_name, last_name, role }) {
  const res = await fetch(ENDPOINTS.REGISTER, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, first_name, last_name, role })
  });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function logout() {
  try {
    await fetch(ENDPOINTS.LOGOUT, { method: "POST", credentials: "include" });
  } catch (e) {}
  saveAccessToken(null);
}

/* ---------- User ---------- */
export async function getMe() {
  const res = await fetchWithAuth(ENDPOINTS.ME, { method: "GET" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

/* ---------- Products ---------- */
export async function getProducts({ q=null, limit=50, offset=0 } = {}) {
  const url = new URL(ENDPOINTS.PRODUCTS, window.location.origin);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);
  const res = await fetch(url.toString(), { credentials: "include" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function getProduct(id) {
  const res = await fetch(`${ENDPOINTS.PRODUCTS}/${id}`, { credentials: "include" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function createProduct(payload) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Create product failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function updateProduct(id, payload) {
  // payload partial
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export async function deleteProduct(id) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${id}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

/* Media upload/delete - optional, depends on backend */
export async function uploadProductMedia(productId, file, is_primary=false) {
  // 1) presign
  const presignRes = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name })
  });
  const presignJson = await presignRes.json().catch(()=>null);
  if (!presignRes.ok) return { ok: false, status: presignRes.status, data: presignJson };

  const { upload_url: uploadUrl, object_key: objectKey } = presignJson;
  if (!uploadUrl || !objectKey) return { ok: false, status: 500, data: { detail: "No upload url" } };

  // 2) PUT directly to MinIO (uploadUrl is presigned)
  try {
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" }
    });
    if (!putRes.ok) {
      return { ok: false, status: putRes.status, data: { detail: "Upload to storage failed" } };
    }
  } catch (e) {
    return { ok: false, status: 0, data: { detail: "Network error on uploading to storage" } };
  }

  // 3) confirm to API
  const confirmRes = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object_key: objectKey, mime_type: file.type || "image/jpeg", is_primary })
  });
  const confirmJson = await confirmRes.json().catch(()=>null);
  return { ok: confirmRes.ok, status: confirmRes.status, data: confirmJson };
}

export async function deleteProductMedia(productId, mediaId) {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/media/${mediaId}`, { method: "DELETE" });
  return { ok: res.ok, status: res.status };
}

/* ---------- Farms ---------- */
export async function getFarms() {
  const res = await fetch(FARMS_ENDPOINT(), { credentials: "include" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}

export function FARMS_ENDPOINT() {
  return ENDPOINTS.FARMS;
}

export async function getMyProducts() {
  const res = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/me`, { method: "GET" });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}


export async function createFarm(payload) {
  // payload: { name, description, owner_id? }
  const res = await fetchWithAuth(ENDPOINTS.FARMS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, data: j };
}
