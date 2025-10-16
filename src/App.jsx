// src/App.jsx
import React, { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import Msg from "./components/Msg";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ProductsList from "./components/ProductsList";
import ProductForm from "./components/ProductForm";
import ProductDetails from "./components/ProductDetails";
import CreateFarm from "./components/CreateFarm";
import Profile from "./components/Profile";
import { getMe, readAccessToken, saveAccessToken, logout as apiLogout, getProducts, deleteProduct, getProduct } from "./api";

export default function App() {
  const [page, setPage] = useState("all");
  const [msg, setMsg] = useState(null);
  const [user, setUser] = useState(null);
  const [openProduct, setOpenProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [query, setQuery] = useState("");
  const [productsForReload, setProductsForReload] = useState(0); // bump to reload lists

  async function loadMe() {
    const token = readAccessToken();
    if (!token) { setUser(null); return; }
    try {
      const r = await getMe();
      if (r.ok) setUser(r.data);
      else { setUser(null); saveAccessToken(null); }
    } catch (e) { setUser(null); }
  }

  useEffect(() => {
    // attempt to refresh token silently by calling /auth/refresh handled inside api.fetchWithAuth in places;
    loadMe();
  }, []);

  function navigate(to) {
    setMsg(null);
    setPage(to);
  }

  async function handleLogout() {
    await apiLogout();
    setUser(null);
    setMsg("✅ Вы вышли");
    setPage("all");
  }

  function openProductView(p) {
    setOpenProduct(p);
    setPage("product_details");
  }

  function openEditProduct(p) {
    setEditingProduct(p);
    setPage("edit_product");
  }

  async function handleDelete(p) {
    if (!window.confirm("Удалить товар?")) return;
    try {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        setMsg("✅ Удалено");
        setProductsForReload(x=>x+1);
        setPage("all");
      } else {
        setMsg("Ошибка удаления");
      }
    } catch (e) { setMsg("Ошибка сети"); }
  }

  return (
    <div className="app">
      <NavBar user={user} onNavigate={navigate} onLogout={handleLogout} />
      <Msg text={msg} />

      <div style={{ marginBottom: 10 }}>
        <input className="input" placeholder="Поиск" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="btn" onClick={() => { setPage("all"); setProductsForReload(x=>x+1); }}>Поиск</button>
      </div>

      {page === "all" && <ProductsList key={productsForReload} q={query} user={user}
        onOpen={p => openProductView(p)}
        onEdit={p => openEditProduct(p)}
        onDelete={p => handleDelete(p)}
      />}

      {page === "login" && <LoginForm setMsg={setMsg} onSuccess={() => { loadMe(); setPage("all"); }} />}

      {page === "register" && <RegisterForm setMsg={setMsg} onSuccess={() => setPage("login")} />}

      {page === "my" && user && <ProductsList q={query} user={user} my={true}
		  onOpen={p => openProductView(p)}
		  onEdit={p => openEditProduct(p)}
		  onDelete={p => handleDelete(p)}
		/>}

      {page === "create_product" && user && user.role === "farmer" && (
        <ProductForm user={user} onDone={(p) => { setMsg("✅ Товар создан"); setPage("product_details"); setOpenProduct(p); }} setMsg={setMsg} />
      )}

      {page === "edit_product" && editingProduct && (
        <ProductForm initial={editingProduct} user={user} onDone={(p) => { setMsg("✅ Сохранено"); setPage("my"); }} setMsg={setMsg} />
      )}

      {page === "create_farm" && user && user.role === "farmer" && <CreateFarm user={user} onDone={() => setPage("all")} setMsg={setMsg} />}

      {page === "product_details" && openProduct && <ProductDetails productId={openProduct.id} onClose={() => setPage("all")} setMsg={setMsg} />}

      {page === "profile" && <Profile user={user} />}

      {!user && page === "my" && <div className="form">Войдите, чтобы просматривать ваши товары</div>}
    </div>
  );
}
