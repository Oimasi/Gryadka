// src/components/RegisterForm.jsx
import React, { useState } from "react";
import { register } from "../api";

export default function RegisterForm({ onSuccess, setMsg }) {
  // Состояния формы регистрации
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState("consumer"); // Роль по умолчанию
  const [loading, setLoading] = useState(false);

  // Обработка отправки формы
  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);
    try {
      const r = await register({ email, password, first_name: first, last_name: last, role });
      if (!r.ok) {
        setMsg && setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка регистрации");
      } else {
        setMsg && setMsg("✅ Зарегистрировано. Войдите.");
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
      <h3>Регистрация</h3>

      {/* Поле ввода email */}
      <div className="row">
        <label className="label" htmlFor="reg-email">Email</label>
        <input id="reg-email" name="email" className="input" type="email" placeholder="" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>

      {/* Поле ввода пароля */}
      <div className="row">
        <label className="label" htmlFor="reg-password">Пароль</label>
        <input id="reg-password" name="password" className="input" placeholder="" aria-label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>

      {/* Поле ввода имени */}
      <div className="row">
        <label className="label" htmlFor="reg-first">Имя</label>
        <input id="reg-first" name="first_name" className="input" placeholder="" aria-label="Имя" value={first} onChange={e => setFirst(e.target.value)} />
      </div>

      {/* Поле ввода фамилии */}
      <div className="row">
        <label className="label" htmlFor="reg-last">Фамилия</label>
        <input id="reg-last" name="last_name" className="input" placeholder="" aria-label="Фамилия" value={last} onChange={e => setLast(e.target.value)} />
      </div>

      {/* Выбор роли */}
      <div className="row">
        <label className="label" htmlFor="reg-role">Роль</label>
        <select id="reg-role" name="role" className="input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="consumer">Покупатель</option>
          <option value="farmer">Фермер</option>
        </select>
      </div>

      {/* Кнопка регистрации */}
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Зарегистрироваться</button>
      </div>
    </form>
  );
}
