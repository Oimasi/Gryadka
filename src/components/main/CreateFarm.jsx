import React, { useState } from "react";
import { createFarm } from "../../api";

export default function CreateFarm({ user, onDone, setMsg }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

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
    <form className="border-1 p-7 border-gray-200 w-full rounded-3xl justify-center mx-auto max-w-[1300px]" onSubmit={submit}>
      <h3 className="text-xl font-semibold mb-4">Создать ферму</h3>

      <div className="row">
        <label className="label" htmlFor="farm-name">Название фермы</label>
        <input id="farm-name" name="farm_name" className="input" placeholder="Название фермы" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div className="row">
        <label className="label" htmlFor="farm-desc">Описание</label>
        <textarea id="farm-desc" name="description" className="input" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-row max-w-[250px]">
        <button className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] w-full transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left cursor-pointer bg-[#3E8D43]/17" type="submit" disabled={loading}>Создать</button>
      </div>
    </form>
  );
}
