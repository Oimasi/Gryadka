// src/components/LoginForm.jsx
import React, { useState } from "react";
import { login, saveAccessToken } from "../api";

export default function LoginForm({ onSuccess, setMsg }) {
  // Состояния формы входа
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Обработка отправки формы
  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);
    try {
      const r = await login({ email, password });
      if (!r.ok) {
        setMsg && setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка входа");
      } else {
        const token = r.data?.access_token;
        if (token) saveAccessToken(token);
        setMsg && setMsg("✅ Вход выполнен");
        onSuccess && onSuccess();
      }
    } catch (err) {
      setMsg && setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h3>Вход</h3>

      {/* Поле ввода email */}
      <div className="row">
        <label className="label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          className="input"
          type="email"
          placeholder=""               
          aria-label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Поле ввода пароля */}
      <div className="row">
        <label className="label" htmlFor="login-password">Пароль</label>
        <input
          id="login-password"
          name="password"
          className="input"
          placeholder=""
          type="password"
          aria-label="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>

      {/* Кнопка входа */}
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Войти</button>
      </div>
    </form>
  );
}
