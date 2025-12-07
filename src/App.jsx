// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import Msg from "./components/main/Msg";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import ProductsList from "./components/main/ProductsList";
import ProductForm from "./components/main/ProductForm";
import ProductDetails from "./components/main/ProductDetails";
import CreateFarm from "./components/main/CreateFarm";
import Profile from "./components/main/Profile";
import { getMe, readAccessToken, logout as apiLogout, deleteProduct } from "./api";
import Header from "./components/main/Header";
import MainPage from "./components/main/mainPage";
import CartPage from "./components/main/CartPage";
import CheckoutPage from "./components/main/CheckoutPage";
import Categories from "./components/main/Categories";
import SuccessPage from "./components/main/Success";
import Fags from "./components/main/Faqs";
import CreateSensorForm from "./components/main/CreateSensorForm";
import ProductQRPage from "./components/main/ProductQRPage";
import MyPlants from "./components/main/MyPlants";

// Обёртка для страницы продукта с параметром из URL
function ProductDetailsWrapper({ setMsg }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ProductDetails
      productId={parseInt(id)}
      onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
      onClose={() => navigate("/products")}
      setMsg={setMsg}
    />
  );
}

// Обёртка для QR-страницы товара
function ProductQRPageWrapper() {
  const { id } = useParams();
  return <ProductQRPage productId={parseInt(id)} />;
}

// Основной компонент приложения
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Состояния приложения
  const [msg, setMsg] = useState(null);
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [productsForReload, setProductsForReload] = useState(0);
  const [categoryFilterActive, setCategoryFilterActive] = useState(false);

  // Сброс прокрутки при изменении маршрута
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  // Обработка выхода пользователя
  async function handleLogout() {
    await apiLogout();
    setUser(null);
    setMsg("✅ Вы вышли");
    navigate("/");
    setCategoryFilterActive(false);
  }

  function handleSelectCategory(category) {
    setSelectedCategory(category);
    setCategoryFilterActive(true);
    setProductsForReload(x => x + 1);
    navigate("/products");
  }

  // Удаление продукта
  async function handleDelete(p) {
    if (!window.confirm("Удалить товар?")) return;
    try {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        setMsg("✅ Удалено");
        setProductsForReload(x => x + 1);
        navigate("/");
      } else {
        setMsg("Ошибка удаления");
      }
    } catch (e) { setMsg("Ошибка сети"); }
  }

  // Определяем показывать ли header
  const showHeader = location.pathname !== "/login" && location.pathname !== "/register" && !location.pathname.startsWith("/qr/");

  return (
    <div className="app">
      {showHeader && (
        <Header
          user={user}
          onNavigate={(path) => {
            setMsg(null);
            setCategoryFilterActive(false);
            const route = path === "main" ? "" : path === "all" ? "products" : path;
            navigate(`/${route}`);
          }}
          onLogout={handleLogout}
          query={query}
          setQuery={setQuery}
          onSearch={() => {
            setCategoryFilterActive(false);
            setProductsForReload(x => x + 1);
            navigate("/products");
          }}
        />
      )}

      <Msg text={msg} />

      <Routes>
        <Route
          path="/"
          element={
            <MainPage
              key={productsForReload}
              q={query}
              user={user}
              onOpen={(p) => navigate(`/product/${p.id}`)}
              onEdit={(p) => navigate(`/edit-product/${p.id}`, { state: { product: p } })}
              onDelete={handleDelete}
              onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
              onSelectCategory={handleSelectCategory}
            />
          }
        />

        <Route
          path="/products"
          element={
            <ProductsList
              key={productsForReload}
              q={query}
              user={user}
              categoryFilterActive={categoryFilterActive}
              onOpen={(p) => navigate(`/product/${p.id}`)}
              category={selectedCategory}
              onEdit={(p) => navigate(`/edit-product/${p.id}`, { state: { product: p } })}
              onDelete={handleDelete}
              onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
            />
          }
        />

        <Route
          path="/categories"
          element={
            <Categories
              onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
              onSelectCategory={handleSelectCategory}
            />
          }
        />

        <Route
          path="/login"
          element={
            <LoginForm
              onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
              setMsg={setMsg}
              onSuccess={() => {
                loadMe();
                navigate("/");
              }}
            />
          }
        />

        <Route
          path="/register"
          element={
            <RegisterForm
              setMsg={setMsg}
              onNavigate={(path) => navigate(`/${path === "main" ? "main" : path === "all" ? "products" : path}`)}
              onSuccess={() => {
                loadMe();
                navigate("/");
              }}
            />
          }
        />

        <Route
          path="/my"
          element={
            user ? (
              <ProductsList
                q={query}
                user={user}
                my={true}
                onOpen={(p) => navigate(`/product/${p.id}`)}
                onEdit={(p) => navigate(`/edit-product/${p.id}`, { state: { product: p } })}
                onDelete={handleDelete}
                onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
              />
            ) : (
              <div className="form">Войдите, чтобы просматривать ваши товары</div>
            )
          }
        />

        <Route
          path="/cart"
          element={
            <CartPage
              onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)}
              onCheckout={() => navigate("/checkout")}
            />
          }
        />

        <Route
          path="/faqs"
          element={<Fags onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)} />}
        />

        <Route
          path="/checkout"
          element={<CheckoutPage onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)} />}
        />

        <Route
          path="/create-product"
          element={
            user && user.role === "farmer" ? (
              <ProductForm
                user={user}
                onDone={(p) => {
                  setMsg("✅ Товар создан");
                  navigate(`/product/${p.id}`);
                }}
                onCancel={() => navigate("/products")}
                setMsg={setMsg}
              />
            ) : (
              <div className="form">Только фермеры могут создавать товары</div>
            )
          }
        />

        <Route
          path="/create-sensor"
          element={
            user && user.role === "farmer" ? (
              <CreateSensorForm
                user={user}
                onDone={() => {
                  setMsg("Датчик создан");
                  navigate("/my");
                }}
                onCancel={() => navigate("/my")}
                setMsg={setMsg}
              />
            ) : (
              <div className="form">Только фермеры могут создавать датчики</div>
            )
          }
        />

        <Route
          path="/edit-product/:id"
          element={<EditProductWrapper user={user} setMsg={setMsg} />}
        />

        <Route
          path="/create-farm"
          element={
            user && user.role === "farmer" ? (
              <CreateFarm
                user={user}
                onDone={() => navigate("/products")}
                onCancel={() => navigate("/my")}
                setMsg={setMsg}
              />
            ) : (
              <div className="form">Только фермеры могут создавать фермы</div>
            )
          }
        />

        <Route
          path="/product/:id"
          element={<ProductDetailsWrapper setMsg={setMsg} />}
        />

        <Route
          path="/qr/:id"
          element={<ProductQRPageWrapper />}
        />

        <Route
          path="/profile"
          element={<Profile user={user} onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)} />}
        />

        <Route
          path="/my-plants"
          element={<MyPlants user={user} onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)} />}
        />

        <Route
          path="/success"
          element={<SuccessPage onNavigate={(path) => navigate(`/${path === "main" ? "" : path === "all" ? "products" : path}`)} />}
        />
      </Routes>
    </div>
  );
}

// Обёртка для редактирования продукта
function EditProductWrapper({ user, setMsg }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем продукт из location state или загружаем
    const locationState = window.history.state?.usr;
    if (locationState?.product) {
      setProduct(locationState.product);
      setLoading(false);
    } else {
      // Можно добавить загрузку продукта по ID
      navigate("/my");
    }
  }, [id, navigate]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <ProductForm
      initial={product}
      user={user}
      onDone={() => {
        setMsg("✅ Сохранено");
        navigate("/my");
      }}
      onCancel={() => navigate("/my")}
      setMsg={setMsg}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
