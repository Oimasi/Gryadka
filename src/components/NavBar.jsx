// src/components/NavBar.jsx
import React from "react";

export default function NavBar({ user, onNavigate, onLogout }) {
  return (
    <div className="nav">
      <button className="btn" onClick={() => onNavigate("all")}>Все товары</button>
      {user && <button className="btn" onClick={() => onNavigate("my")}>Мои товары</button>}
      {user && user.role === "farmer" && <button className="btn" onClick={() => onNavigate("create_product")}>Создать товар</button>}
      {user && user.role === "farmer" && <button className="btn" onClick={() => onNavigate("create_farm")}>Создать ферму</button>}
      <div style={{ flex: 1 }} />
      {user ? (
        <>
          <span className="small">Привет, {user.first_name || user.email} ({user.role})</span>
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
