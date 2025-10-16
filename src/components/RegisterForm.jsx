// src/components/RegisterForm.jsx
import React, { useState } from "react";
import { register } from "../api";

export default function RegisterForm({ onSuccess, setMsg }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState("consumer");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const r = await register({ email, password, first_name: first, last_name: last, role });
      if (!r.ok) {
        setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка регистрации");
      } else {
        setMsg("✅ Зарегистрировано. Войдите.");
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
      <h3>Регистрация</h3>
      <div className="row"><input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="row"><input className="input" placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
      <div className="row"><input className="input" placeholder="Имя" value={first} onChange={e => setFirst(e.target.value)} /></div>
      <div className="row"><input className="input" placeholder="Фамилия" value={last} onChange={e => setLast(e.target.value)} /></div>
      <div className="row">
        <label className="small">Роль</label>
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="consumer">Покупатель</option>
          <option value="farmer">Фермер</option>
        </select>
      </div>
      <div className="row"><button className="btn" type="submit" disabled={loading}>Зарегистрироваться</button></div>
    </form>
  );
}
