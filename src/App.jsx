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
import { getMe, readAccessToken, logout as apiLogout, getProducts, deleteProduct, getProduct } from "./api";

export default function App() {
  // Состояния приложения
  const [page, setPage] = useState("all");                    // Текущая страница
  const [msg, setMsg] = useState(null);                       // Сообщение для отображения
  const [user, setUser] = useState(null);                     // Данные пользователя
  const [openProduct, setOpenProduct] = useState(null);       // Открытый продукт
  const [editingProduct, setEditingProduct] = useState(null); // Редактируемый продукт
  const [query, setQuery] = useState("");                     // Поисковый запрос
  // Счетчик для принудительной перезагрузки списков
  const [productsForReload, setProductsForReload] = useState(0); // изменить значение, чтобы перезагрузить списки

  // Загрузка данных пользователя при запуске приложения
  async function loadMe() {
    const token = readAccessToken();
    if (!token) { setUser(null); return; }
    try {
      const r = await getMe();
      if (r.ok) setUser(r.data);
      else { setUser(null); }
    } catch (e) { setUser(null); }
  }

  useEffect(() => {
    loadMe();
  }, []);

  // Навигация между страницами
  function navigate(to) {
    setMsg(null);
    setPage(to);
  }

  // Обработка выхода пользователя
  async function handleLogout() {
    await apiLogout();
    setUser(null);
    setMsg("✅ Вы вышли");
    setPage("all");
  }

  // Открытие деталей продукта
  function openProductView(p) {
    setOpenProduct(p);
    setPage("product_details");
  }

  // Открытие формы редактирования продукта
  function openEditProduct(p) {
    setEditingProduct(p);
    setPage("edit_product");
  }

  // Удаление продукта
  async function handleDelete(p) {
    if (!window.confirm("Удалить товар?")) return;
    try {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        setMsg("✅ Удалено");
        setProductsForReload(x=>x+1); // Триггер перезагрузки списков
        setPage("all");
      } else {
        setMsg("Ошибка удаления");
      }
    } catch (e) { setMsg("Ошибка сети"); }
  }

  return (
    <div className="app">
      {/* Навигационная панель */}
      <NavBar user={user} onNavigate={navigate} onLogout={handleLogout} />
      {/* Отображение сообщений */}
      <Msg text={msg} />

      {/* Поисковая строка */}
      <div className="search-row" style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Поиск"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Поиск товаров"
        />
        <button
          className="btn search-btn"
          onClick={() => { setPage("all"); setProductsForReload(x=>x+1); }} // Триггер перезагрузки списков
          aria-label="Выполнить поиск"
        >
          Поиск
        </button>
      </div>

      {/* Условный рендеринг страниц */}
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
        <ProductForm
          user={user}
          onDone={(p) => { setMsg("✅ Товар создан"); setPage("product_details"); setOpenProduct(p); }}
          onCancel={() => setPage("all")}
          setMsg={setMsg}
        />
      )}

      {page === "edit_product" && editingProduct && (
        <ProductForm
          initial={editingProduct}
          user={user}
          onDone={(p) => { setMsg("✅ Сохранено"); setPage("my"); }}
          onCancel={() => setPage("my")}
          setMsg={setMsg}
        />
      )}

      {page === "create_farm" && user && user.role === "farmer" && <CreateFarm user={user} onDone={() => setPage("all")} setMsg={setMsg} />}

      {page === "product_details" && openProduct && <ProductDetails productId={openProduct.id} onClose={() => setPage("all")} setMsg={setMsg} />}

      {page === "profile" && <Profile user={user} />}

      {!user && page === "my" && <div className="form">Войдите, чтобы просматривать ваши товары</div>}
    </div>
  );
}
