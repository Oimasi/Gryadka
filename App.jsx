// App.jsx
import React, { useEffect, useState, useCallback } from "react";
import "./styles.css";



const API_ROOT = "/api";
const LOGIN_ENDPOINT = `${API_ROOT}/auth/login`;
const REGISTER_ENDPOINT = `${API_ROOT}/auth/register`;
const REFRESH_ENDPOINT = `${API_ROOT}/auth/refresh`;
const LOGOUT_ENDPOINT = `${API_ROOT}/auth/logout`;
const PRODUCTS_ENDPOINT = `${API_ROOT}/products`;
const FARMS_ENDPOINT = `${API_ROOT}/farms`;
const USER_ME = `${API_ROOT}/users/me`;

const tokenKey = "gryadka_access_token";

function saveToken(token) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}
function readToken() {
  return localStorage.getItem(tokenKey);
}

async function fetchWithAuth(input, init = {}, retry = true) {
  const token = readToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const cfg = { credentials: "include", ...init, headers };
  let res = await fetch(input, cfg);

  if (res.status === 401 && retry) {
    try {
      const refreshRes = await fetch(REFRESH_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        if (json?.access_token) {
          saveToken(json.access_token);
          headers.set("Authorization", `Bearer ${json.access_token}`);
          const cfg2 = { ...cfg, headers };
          res = await fetch(input, cfg2);
        }
      } else {
        
        saveToken(null);
      }
    } catch (e) {
      
    }
  }
  return res;
}

function Msg({ text }) {
  if (!text) return null;
  const cls = text.startsWith("✅") ? "msg success" : "msg error";
  return <div className={cls}>{text}</div>;
}



/* ------------------------ App components ------------------------ */

function Nav({ user, onNavigate, onLogout }) {
  return (
    <div className="nav">
      <button className="btn" onClick={() => onNavigate("all")}>Все товары</button>
      {user && <button className="btn" onClick={() => onNavigate("my")}>Мои товары</button>}
      {user && user.role === "farmer" && <button className="btn" onClick={() => onNavigate("create_product")}>Создать товар</button>}
      {user && user.role === "farmer" && <button className="btn" onClick={() => onNavigate("create_farm")}>Создать ферму</button>}
      <div style={{ flex: 1 }} />
      {user ? (
        <>
          <span className="small">Привет, {user.first_name} ({user.role})</span>
          <button className="btn" onClick={() => onNavigate("profile")}>Профиль</button>
          <button className="btn" onClick={onLogout}>Выйти</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => onNavigate("login")}>Войти</button>
          <button className="btn" onClick={() => onNavigate("register")}>Регистрация</button>
        </>
      )}
    </div>
  );
}

function LoginForm({ onSuccess, setMsg }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg((json && json.detail) || "Ошибка входа");
      } else {
        saveToken(json.access_token);
        setMsg("✅ Вход выполнен");
        onSuccess && onSuccess();
      }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Вход</h3>
      <div className="row">
        <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="row">
        <input type="password" className="input" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn" disabled={loading} type="submit">Войти</button>
      </div>
    </form>
  );
}

function RegisterForm({ onSuccess, setMsg }) {
  const [payload, setPayload] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    role: "consumer",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg((json && (json.detail || JSON.stringify(json))) || "Ошибка регистрации");
      } else {
        setMsg("✅ Регистрация успешна. Теперь войдите.");
        onSuccess && onSuccess();
      }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Регистрация</h3>
      <div className="row">
        <input className="input" placeholder="Email" value={payload.email} onChange={e => setPayload({ ...payload, email: e.target.value })} />
      </div>
      <div className="row">
        <input className="input" placeholder="Имя" value={payload.first_name} onChange={e => setPayload({ ...payload, first_name: e.target.value })} />
        <input className="input" placeholder="Фамилия" value={payload.last_name} onChange={e => setPayload({ ...payload, last_name: e.target.value })} />
      </div>
      <div className="row">
        <input className="input" placeholder="Отчество (опционально)" value={payload.middle_name} onChange={e => setPayload({ ...payload, middle_name: e.target.value })} />
      </div>
      <div className="row">
        <input type="password" className="input" placeholder="Пароль (мин 8)" value={payload.password} onChange={e => setPayload({ ...payload, password: e.target.value })} />
      </div>
      <div className="row">
        <label className="small">Роль:</label>
        <select className="input" value={payload.role} onChange={e => setPayload({ ...payload, role: e.target.value })}>
          <option value="consumer">Покупатель</option>
          <option value="farmer">Фермер</option>
        </select>
      </div>
      <div className="row">
        <button className="btn" disabled={loading} type="submit">Зарегистрироваться</button>
      </div>
    </form>
  );
}

function ProductCard({ p, onOpen, user, onEdit, onDelete }) {
  const primary = (p.media && p.media.find(m => m.is_primary)) || (p.media && p.media[0]);
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12 }}>
        {primary && primary.presigned_url ? <img src={primary.presigned_url} alt="" className="img-thumb" /> : <div style={{ width: 120, height: 80, background: "#f0f0f0", borderRadius:6 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{p.name}</strong>
              <div className="small">id: {p.id} • владелец: {p.owner_id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="small">{p.is_active ? "Активен" : "Неактивен"}</div>
            </div>
          </div>
          <div className="small" style={{ marginTop: 8 }}>{p.short_description}</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => onOpen(p)}>Открыть</button>
            {user && (user.role === "admin" || (user.role === "farmer" && user.id === p.owner_id)) && (
              <>
                <button className="btn" onClick={() => onEdit(p)} style={{ marginLeft: 8 }}>Редактировать</button>
                <button className="btn" onClick={() => onDelete(p)} style={{ marginLeft: 8 }}>Удалить</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsList({ q, onOpen, user, onEdit, onDelete }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(PRODUCTS_ENDPOINT, window.location.origin);
      if (q) url.searchParams.set("q", q);
      const res = await fetch(url.toString(), { credentials: "include" });
      const json = await res.json();
      if (res.ok) setProducts(json);
      else setProducts([]);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h3>Каталог</h3>
      <div style={{ marginBottom: 8 }}>
        <button className="btn" onClick={load}>Обновить</button>
        <span className="small" style={{ marginLeft: 8 }}>Всего: {products.length}</span>
      </div>
      {loading && <div className="small">Загрузка...</div>}
      {products.map(p => (
        <ProductCard key={p.id} p={p} onOpen={onOpen} user={user} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function MyProducts({ user, onOpen, onEdit, setMsg }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(PRODUCTS_ENDPOINT, { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        const mine = json.filter(p => p.owner_id === user.id);
        setProducts(mine);
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function handleDelete(p) {
    if (!window.confirm("Удалить (soft-delete) товар?")) return;
    try {
      const res = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${p.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setMsg("✅ Товар помечен как неактивный");
        load();
      } else {
        const json = await res.json();
        setMsg(json.detail || "Ошибка удаления");
      }
    } catch (e) {
      setMsg("Ошибка сети");
    }
  }

  return (
    <div>
      <h3>Мои товары</h3>
      <div style={{ marginBottom: 8 }}>
        <button className="btn" onClick={load}>Обновить</button>
      </div>
      {loading && <div className="small">Загрузка...</div>}
      {products.map(p => (
        <ProductCard key={p.id} p={p} onOpen={onOpen} user={user} onEdit={onEdit} onDelete={handleDelete} />
      ))}
      {products.length === 0 && !loading && <div className="small">Товары не найдены</div>}
    </div>
  );
}

function CreateProduct({ user, onDone, setMsg }) {
  const [name, setName] = useState("");
  const [short_description, setShort] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth(PRODUCTS_ENDPOINT + "/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, short_description }),
      });
      const json = await res.json();
      if (!res.ok) setMsg(json.detail || "Ошибка создания");
      else {
        setMsg("✅ Товар создан");
        onDone && onDone(json);
      }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally { setLoading(false); }
  }

  if (!user || (user.role !== "farmer" && user.role !== "admin")) {
    return <div className="small">Только фермеры/админы могут создавать товары.</div>;
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Создать товар</h3>
      <div className="row">
        <input className="input" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="row">
        <input className="input" placeholder="Короткое описание" value={short_description} onChange={e => setShort(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Создать</button>
      </div>
    </form>
  );
}

function EditProduct({ product, onDone, setMsg }) {
  const [name, setName] = useState(product.name || "");
  const [short_description, setShort] = useState(product.short_description || "");
  const [is_active, setActive] = useState(product.is_active);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, short_description, is_active }),
      });
      const json = await res.json();
      if (!res.ok) setMsg(json.detail || "Ошибка обновления");
      else {
        setMsg("✅ Товар обновлён");
        onDone && onDone(json);
      }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally { setLoading(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Редактировать товар (id: {product.id})</h3>
      <div className="row">
        <input className="input" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="row">
        <input className="input" placeholder="Короткое описание" value={short_description} onChange={e => setShort(e.target.value)} />
      </div>
      <div className="row">
        <label className="small">Активен</label>
        <input type="checkbox" checked={is_active} onChange={e => setActive(e.target.checked)} />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Сохранить</button>
      </div>
    </form>
  );
}

function CreateFarm({ user, setMsg, onDone }) {
  const [name, setName] = useState("");
  const [description, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const payload = { name, description, owner_id: user.id };
      const res = await fetchWithAuth(FARMS_ENDPOINT + "/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) setMsg(json.detail || "Ошибка создания фермы");
      else {
        setMsg("✅ Ферма создана");
        onDone && onDone(json);
      }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally { setLoading(false); }
  }

  if (!user || (user.role !== "farmer" && user.role !== "admin")) {
    return <div className="small">Только фермеры/админы могут создавать фермы.</div>;
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Создать ферму</h3>
      <div className="row">
        <input className="input" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="row">
        <textarea className="input" placeholder="Описание" value={description} onChange={e => setDesc(e.target.value)} rows={4} />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Создать ферму</button>
      </div>
    </form>
  );
}

/* Product Details + passport + media upload */
function ProductDetails({ productId, user, onClose, setMsg, refreshParent }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PRODUCTS_ENDPOINT}/${productId}`, { credentials: "include" });
      if (!res.ok) {
        setProduct(null);
        const json = await res.json();
        setMsg(json.detail || "Ошибка получения товара");
      } else {
        const json = await res.json();
        setProduct(json);
      }
    } catch (e) {
      setMsg("Ошибка сети");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function uploadFile(file, isPrimary = false) {
    try {
      
      const presignRes = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${productId}/media/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) {
        setMsg(presignJson.detail || "Ошибка получения presign URL");
        return;
      }
      const { upload_url, object_key } = presignJson;

      
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!(putRes.ok || putRes.status === 200 || putRes.status === 204)) {
        setMsg("Ошибка загрузки файла на хранилище");
        return;
      }

      
      const confirmRes = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${productId}/media/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_key,
          mime_type: file.type || "application/octet-stream",
          is_primary: isPrimary,
          meta: { filename: file.name },
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) {
        setMsg(confirmJson.detail || "Ошибка подтверждения медиа");
        return;
      }
      setMsg("✅ Фото загружено");
      load();
      refreshParent && refreshParent();
    } catch (e) {
      setMsg("Ошибка сети при загрузке фото");
    }
  }

  async function handleDeleteMedia(media) {
    if (!window.confirm("Удалить фото?")) return;
    try {
      const res = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${productId}/media/${media.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setMsg("✅ Фото удалено");
        load();
      } else {
        const json = await res.json();
        setMsg(json.detail || "Ошибка удаления медиа");
      }
    } catch (e) {
      setMsg("Ошибка сети");
    }
  }

  
  async function savePassport(passport) {
    try {
      const res = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${productId}/passport`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passport),
      });
      const json = await res.json();
      if (!res.ok) setMsg(json.detail || "Ошибка сохранения паспорта");
      else {
        setMsg("✅ Паспорт сохранён");
        load();
      }
    } catch (e) {
      setMsg("Ошибка сети");
    }
  }

  if (!product && !loading) return <div className="small">Товар не найден</div>;
  if (!product) return <div className="small">Загрузка...</div>;

  const canEditPassport = user && (user.role === "admin" || (user.role === "farmer" && user.id === product.owner_id));
  const canUploadMedia = canEditPassport;

  return (
    <div className="form">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>{product.name} (id: {product.id})</h3>
        <div>
          <button className="btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
      <div className="small">Описание: {product.short_description}</div>
      <div style={{ marginTop: 8 }}>
        <h4>Медиа</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {product.media && product.media.length > 0 ? product.media.map(m => (
            <div key={m.id} style={{ width: 140, border: "1px solid #eee", padding: 6, borderRadius:6 }}>
              {m.presigned_url ? <img src={m.presigned_url} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius:4 }} /> : <div style={{ height: 90, background:"#f5f5f5" }} />}
              <div className="small">id:{m.id}</div>
              <div className="small">primary: {m.is_primary ? "yes" : "no"}</div>
              {canUploadMedia && <div style={{ marginTop:6 }}>
                <button className="btn" onClick={() => handleDeleteMedia(m)}>Удалить</button>
              </div>}
            </div>
          )) : <div className="small">Нет фото</div>}
        </div>

        {canUploadMedia && (
          <div style={{ marginTop: 10 }}>
            <h5>Загрузить фото</h5>
            <FileUpload onUpload={uploadFile} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Паспорт</h4>
        {product.passport ? (
          <PassportView passport={product.passport} editable={canEditPassport} onSave={savePassport} />
        ) : (
          <div className="small">Паспорт отсутствует</div>
        )}
      </div>
    </div>
  );
}

function FileUpload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [isPrimary, setPrimary] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    await onUpload(file, isPrimary);
    setFile(null);
    setPrimary(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <label className="small">Сделать главным</label>
      <input type="checkbox" checked={isPrimary} onChange={e => setPrimary(e.target.checked)} />
      <button className="btn" type="submit">Загрузить</button>
    </form>
  );
}

function PassportView({ passport, editable, onSave }) {
  const [state, setState] = useState({
    origin: passport.origin || "",
    variety: passport.variety || "",
    harvest_date: passport.harvest_date ? passport.harvest_date.split("T")[0] : "",
    certifications: passport.certifications || [],
    data: passport.data || {},
  });

  useEffect(() => setState({
    origin: passport.origin || "",
    variety: passport.variety || "",
    harvest_date: passport.harvest_date ? passport.harvest_date.split("T")[0] : "",
    certifications: passport.certifications || [],
    data: passport.data || {},
  }), [passport]);

  function addCert() {
    setState(s => ({ ...s, certifications: [...s.certifications, { name: "", issuer: "" }] }));
  }
  function updateCert(idx, field, val) {
    const arr = [...state.certifications];
    arr[idx] = { ...arr[idx], [field]: val };
    setState(s => ({ ...s, certifications: arr }));
  }
  function delCert(idx) {
    const arr = [...state.certifications]; arr.splice(idx, 1);
    setState(s => ({ ...s, certifications: arr }));
  }

  async function save() {
    const payload = {
      origin: state.origin || null,
      variety: state.variety || null,
      harvest_date: state.harvest_date ? new Date(state.harvest_date).toISOString() : null,
      certifications: state.certifications || [],
      data: state.data || {},
    };
    await onSave(payload);
  }

  return (
    <div>
      <div className="row">
        <label className="small">Регион/происхождение</label>
        <input className="input" value={state.origin} onChange={e => setState({ ...state, origin: e.target.value })} readOnly={!editable} />
      </div>
      <div className="row">
        <label className="small">Сорт/вид</label>
        <input className="input" value={state.variety} onChange={e => setState({ ...state, variety: e.target.value })} readOnly={!editable} />
      </div>
      <div className="row">
        <label className="small">Дата сбора</label>
        <input type="date" className="input" value={state.harvest_date} onChange={e => setState({ ...state, harvest_date: e.target.value })} readOnly={!editable} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="small">Сертификаты</div>
        {state.certifications.map((c, i) => (
          <div className="row" key={i}>
            <input className="input" placeholder="Название" value={c.name || ""} onChange={e => updateCert(i, "name", e.target.value)} readOnly={!editable} />
            <input className="input" placeholder="Выдавший" value={c.issuer || ""} onChange={e => updateCert(i, "issuer", e.target.value)} readOnly={!editable} />
            {editable && <button className="btn" onClick={() => delCert(i)} type="button">Удалить</button>}
          </div>
        ))}
        {editable && <button className="btn" onClick={addCert} type="button">Добавить сертификат</button>}
      </div>
      {editable && <div style={{ marginTop: 8 }}><button className="btn" onClick={save}>Сохранить паспорт</button></div>}
    </div>
  );
}

function Profile({ user }) {
  if (!user) return <div className="small">Войдите</div>;
  return (
    <div className="form">
      <h3>Профиль</h3>
      <div className="small">ID: {user.id}</div>
      <div className="small">Email: {user.email}</div>
      <div className="small">Имя: {user.first_name} {user.middle_name || ""} {user.last_name}</div>
      <div className="small">Роль: {user.role}</div>
    </div>
  );
}

/* ------------------------ Main App ------------------------ */

export default function App() {
  const [page, setPage] = useState("all");
  const [msg, setMsg] = useState(null);
  const [user, setUser] = useState(null);
  const [openProductId, setOpenProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [query, setQuery] = useState("");

  async function loadMe() {
    const token = readToken();
    if (!token) { setUser(null); return; }
    try {
      const res = await fetchWithAuth(USER_ME, { method: "GET" });
      if (!res.ok) {
        setUser(null);
        saveToken(null);
      } else {
        const json = await res.json();
        setUser(json);
      }
    } catch (e) {
      setUser(null);
    }
  }

  useEffect(() => {
    loadMe();
    
    (async () => {
      try {
        const r = await fetch(REFRESH_ENDPOINT, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (r.ok) {
          const j = await r.json();
          if (j.access_token) { saveToken(j.access_token); await loadMe(); }
        }
      } catch (e) {}
    })();
  }, []);

  async function handleLogout() {
    setMsg(null);
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST", credentials: "include" }); 
    } catch (e) {}
    saveToken(null);
    setUser(null);
    setMsg("✅ Вы вышли");
    setPage("all");
  }

  function handleOpenProduct(p) {
    setOpenProductId(p.id);
    setPage("product_details");
  }

  async function onCreateProductDone(p) {
    setMsg("✅ Товар создан, открыл детали");
    setEditingProduct(null);
    setOpenProductId(p.id);
    setPage("product_details");
  }

  async function onEditDone(updated) {
    setMsg("✅ Сохранено");
    setEditingProduct(null);
    if (openProductId === updated.id) {
      setOpenProductId(updated.id); // refresh details
    }
    setPage("my");
  }

  async function handleDeleteProduct(p) {
    if (!window.confirm("Вы уверены?")) return;
    try {
      const res = await fetchWithAuth(`${PRODUCTS_ENDPOINT}/${p.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setMsg("✅ Удалено (soft)");
      } else {
        const json = await res.json();
        setMsg(json.detail || "Ошибка");
      }
    } catch (e) {
      setMsg("Ошибка сети");
    }
  }

  return (
    <div className="app">
      <Nav user={user} onNavigate={setPage} onLogout={handleLogout} />
      <Msg text={msg} />
      <div style={{ marginBottom: 10 }}>
        <input className="input" placeholder="Поиск (по названию/описанию)" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="btn" onClick={() => setPage("all")}>Поиск</button>
      </div>

      {page === "all" && <ProductsList q={query} onOpen={handleOpenProduct} user={user} onEdit={p => { setEditingProduct(p); setPage("edit_product"); }} onDelete={handleDeleteProduct} />}

      {page === "login" && <LoginForm onSuccess={() => { loadMe(); setPage("all"); }} setMsg={setMsg} />}

      {page === "register" && <RegisterForm onSuccess={() => setPage("login")} setMsg={setMsg} />}

      {page === "my" && user && <MyProducts user={user} onOpen={handleOpenProduct} onEdit={p => { setEditingProduct(p); setPage("edit_product"); }} setMsg={setMsg} />}

      {page === "create_product" && <CreateProduct user={user} onDone={onCreateProductDone} setMsg={setMsg} />}

      {page === "edit_product" && editingProduct && <EditProduct product={editingProduct} onDone={onEditDone} setMsg={setMsg} />}

      {page === "create_farm" && <CreateFarm user={user} setMsg={setMsg} onDone={(f) => { setMsg("✅ Ферма создана"); setPage("all"); }} />}

      {page === "product_details" && openProductId && <ProductDetails productId={openProductId} user={user} onClose={() => setPage("all")} setMsg={setMsg} refreshParent={() => {}} />}

      {page === "profile" && <Profile user={user} />}
    </div>
  );
}