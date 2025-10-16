// src/components/LoginForm.jsx
import React, { useState } from "react";
import { login, saveAccessToken } from "../api";

export default function LoginForm({ onSuccess, setMsg }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const r = await login({ email, password });
      if (!r.ok) {
        setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка входа");
      } else {
        const token = r.data?.access_token;
        if (token) saveAccessToken(token);
        setMsg("✅ Вход выполнен");
        onSuccess && onSuccess();
      }
    } catch (err) {
      setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Вход</h3>
      <div className="row"><input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="row"><input className="input" placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
      <div className="row"><button className="btn" type="submit" disabled={loading}>Войти</button></div>
    </form>
  );
}
