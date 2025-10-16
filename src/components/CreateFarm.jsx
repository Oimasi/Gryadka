// src/components/CreateFarm.jsx
import React, { useState } from "react";
import { createFarm } from "../api";

export default function CreateFarm({ user, onDone, setMsg }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const payload = { name, description, owner_id: user?.id };
      const r = await createFarm(payload);
      if (!r.ok) setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка создания фермы");
      else { setMsg("✅ Ферма создана"); onDone && onDone(r.data); }
    } catch (e) {
      setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>Создать ферму</h3>
      <div className="row"><input className="input" placeholder="Название фермы" value={name} onChange={e => setName(e.target.value)} required /></div>
      <div className="row"><textarea className="input" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} /></div>
      <div className="row"><button className="btn" type="submit" disabled={loading}>Создать</button></div>
    </form>
  );
}
