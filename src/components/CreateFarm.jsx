// src/components/CreateFarm.jsx
import React, { useState } from "react";
import { createFarm } from "../api";

export default function CreateFarm({ user, onDone, setMsg }) {
  // Состояния для формы создания фермы
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Обработка отправки формы
  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);
    try {
      const payload = { name, description, owner_id: user?.id };
      const r = await createFarm(payload);
      if (!r.ok) setMsg && setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка создания фермы");
      else { setMsg && setMsg("✅ Ферма создана"); onDone && onDone(r.data); }
    } catch (e) {
      setMsg && setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Создать ферму</h3>

      {/* Поле ввода названия фермы */}
      <div className="row">
        <label className="label" htmlFor="farm-name">Название фермы</label>
        <input id="farm-name" name="farm_name" className="input" placeholder="Название фермы" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      {/* Поле ввода описания фермы */}
      <div className="row">
        <label className="label" htmlFor="farm-desc">Описание</label>
        <textarea id="farm-desc" name="description" className="input" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      {/* Кнопка отправки формы */}
      <div className="row">
        <button className="btn" type="submit" disabled={loading}>Создать</button>
      </div>
    </form>
  );
}
