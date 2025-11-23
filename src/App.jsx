// src/App.jsx
import React, { useEffect, useState } from "react";
import Msg from "./components/main/Msg";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import ProductsList from "./components/main/ProductsList";
import ProductForm from "./components/main/ProductForm";
import ProductDetails from "./components/main/ProductDetails";
import CreateFarm from "./components/main/CreateFarm";
import Profile from "./components/main/Profile";
import { getMe, readAccessToken, logout as apiLogout, getProducts, deleteProduct, getProduct } from "./api";
import Header from "./components/main/Header";
import MainPage from "./components/main/mainPage";
import CartPage from "./components/main/CartPage";
import CheckoutPage from "./components/main/CheckoutPage";
import Categories from "./components/main/Categories";
import SuccessPage from "./components/main/Success";
import Fags from "./components/main/Faqs";
import CreateSensorForm from "./components/main/CreateSensorForm";

export default function App() {
  // Состояния приложения
  const [page, setPage] = useState("main");                    // Текущая страница
  const [msg, setMsg] = useState(null);                       // Сообщение для отображения
  const [user, setUser] = useState(null);                     // Данные пользователя
  const [openProduct, setOpenProduct] = useState(null);       // Открытый продукт
  const [editingProduct, setEditingProduct] = useState(null); // Редактируемый продукт
  const [query, setQuery] = useState("");                     // Поисковый запрос
  // Счетчик для принудительной перезагрузки списков
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [productsForReload, setProductsForReload] = useState(0); // изменить значение, чтобы перезагрузить списки

  const [categoryFilterActive, setCategoryFilterActive] = useState(false);

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
    setCategoryFilterActive(false);
  }

  // Обработка выхода пользователя
  async function handleLogout() {
    await apiLogout();
    setUser(null);
    setMsg("✅ Вы вышли");
    setPage("main");
    setCategoryFilterActive(false);
  }

  function handleSelectCategory(category) {
    setSelectedCategory(category);
    setPage("all");
    setCategoryFilterActive(true); 
    setProductsForReload(x => x + 1); 
  }
  
  // Открытие деталей продукта
  function openProductView(p) {
    setOpenProduct(p);
    setPage("product_details");
    setCategoryFilterActive(false);
  }

  // Открытие формы редактирования продукта
  function openEditProduct(p) {
    setEditingProduct(p);
    setPage("edit_product");
    setCategoryFilterActive(false);
  }

  // Удаление продукта
  async function handleDelete(p) {
    if (!window.confirm("Удалить товар?")) return;
    try {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        setMsg("✅ Удалено");
        setProductsForReload(x=>x+1); // Триггер перезагрузки списков
        setPage("main");
      } else {
        setMsg("Ошибка удаления");
      }
    } catch (e) { setMsg("Ошибка сети"); }
  }

  const showHeader = page !== "login" && page !== "register";

  return (
    <div className="app">

      {showHeader && (
        <>
          <Header
            user={user}
            onNavigate={navigate}
            onLogout={handleLogout}
            query={query}
            setQuery={setQuery}
            onSearch={() => { setCategoryFilterActive(false); setPage("all"); setProductsForReload(x => x + 1); }}
          />
        </>
      )}

      <Msg text={msg} />

      {page === "main" && <MainPage key={productsForReload} q={query} user={user}
        onOpen={p => openProductView(p)}
        onEdit={p => openEditProduct(p)}
        onDelete={p => handleDelete(p)}
        onNavigate={navigate}
        onSelectCategory={handleSelectCategory}
      />}

      {page === "all" && <ProductsList key={productsForReload} q={query} user={user}
        categoryFilterActive={categoryFilterActive}
        onOpen={p => openProductView(p)}
        category={selectedCategory}
        onEdit={p => openEditProduct(p)}
        onDelete={p => handleDelete(p)}
      />}

      {page === "categories" && <Categories onNavigate={navigate} onSelectCategory={handleSelectCategory} />}

      {page === "login" && <LoginForm onNavigate={navigate} setMsg={setMsg} onSuccess={() => { loadMe(); setPage("main"); }} />}

      {page === "register" && <RegisterForm setMsg={setMsg} onNavigate={navigate} onSuccess={() => setPage("login")} />}

      {page === "my" && user && <ProductsList q={query} user={user} my={true}
        onOpen={p => openProductView(p)}
        onEdit={p => openEditProduct(p)}
        onDelete={p => handleDelete(p)}
        onNavigate={navigate}
      />}

      {page == "cart" && <CartPage onNavigate={navigate} onCheckout={(cart) => { navigate("checkout") }} />}

      {page == "faqs" && <Fags onNavigate={navigate} />}

      {page === "checkout" && <CheckoutPage onNavigate={navigate} />}

      {page === "create_product" && user && user.role === "farmer" && (
        <ProductForm
          user={user}
          onDone={(p) => { setMsg("✅ Товар создан"); setPage("product_details"); setOpenProduct(p); }}
          onCancel={() => setPage("all")}
          setMsg={setMsg}
        />
      )}
      {page === "create_sensor" && user && user.role === "farmer" && (
        <CreateSensorForm
          user={user}
          onDone={() => {
            setMsg("Датчик создан");
            setPage("my");
          }}
          onCancel={() => setPage("my")}
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

      {page === "create_farm" && user && user.role === "farmer" && <CreateFarm user={user} onDone={() => setPage("all")} onCancel={() => setPage("my")} setMsg={setMsg} />}

      {page === "product_details" && openProduct && <ProductDetails onNavigate={navigate} productId={openProduct.id} onClose={() => setPage("all")} setMsg={setMsg} />}

      {page === "profile" && <Profile user={user}  onNavigate={navigate}/>}

      {page === "success" && <SuccessPage onNavigate={navigate}/>}

      {!user && page === "my" && <div className="form">Войдите, чтобы просматривать ваши товары</div>}
    </div>
  );
}