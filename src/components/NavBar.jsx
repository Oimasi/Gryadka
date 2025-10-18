// src/components/NavBar.jsx
import React from "react";

// Компонент аватара пользователя
function Avatar({ user }) {
  const isFarmer = user?.role === "farmer";
  const name = user?.first_name || user?.email || "";
  const label = isFarmer ? `Фермер ${name}` : `Пользователь ${name}`;

  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 6px",
    borderRadius: 999,
    background: "transparent",        
    border: "1px solid rgba(15,23,42,0.03)",
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 13
  };

  const emojiStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    fontSize: 18,
  };

  return (
    <div className="avatar" style={style} aria-label={label} title={label}>
      <span style={emojiStyle}>
        {isFarmer ? "👩‍🌾" : "👤"}
      </span>
      <span style={{ opacity: 0.95 }}>{user.first_name ? user.first_name : (user.email || "")}</span>
    </div>
  );
}

export default function NavBar({ user, onNavigate, onLogout }) {
  return (
    <nav className="nav" role="navigation" aria-label="Главная навигация">
      {/* Левая часть навигационной панели */}
      <div className="nav-left">
        <button className="btn nav-btn" onClick={() => onNavigate("all")}>Все товары</button>
        {user && <button className="btn nav-btn" onClick={() => onNavigate("my")}>Мои товары</button>}
        {user && user.role === "farmer" && <button className="btn nav-btn" onClick={() => onNavigate("create_product")}>Создать товар</button>}
        {user && user.role === "farmer" && <button className="btn nav-btn" onClick={() => onNavigate("create_farm")}>Создать ферму</button>}
      </div>

      {/* Разделитель */}
      <div className="nav-spacer" />

      {/* Правая часть навигационной панели */}
      <div className="nav-right">
        {user ? (
          <>
            <Avatar user={user} />
            <button className="btn nav-btn" onClick={() => onNavigate("profile")}>Профиль</button>
            <button className="btn nav-btn" onClick={onLogout}>Выйти</button>
          </>
        ) : (
          <>
            <button className="btn nav-btn" onClick={() => onNavigate("login")}>Войти</button>
            <button className="btn nav-btn" onClick={() => onNavigate("register")}>Регистрация</button>
          </>
        )}
      </div>
    </nav>
  );
}
