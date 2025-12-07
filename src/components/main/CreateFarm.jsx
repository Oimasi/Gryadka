import React, { useEffect, useState } from "react";
import { createFarm } from "../../api";

export default function CreateFarm({ user, onDone, setMsg, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoNote, setGeoNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoNote("Геолокация подставлена автоматически");
      },
      () => {
        setGeoNote("Геолокацию не удалось определить, заполните координаты вручную");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    if (!latitude || !longitude) {
      setMsg && setMsg("Укажите координаты фермы");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name,
        description,
        owner_id: user?.id,
        latitude: Number(latitude),
        longitude: Number(longitude)
      };
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

      <div className="row mb-5">
        <label className="label" htmlFor="farm-name">Название фермы</label>
        <input id="farm-name" name="farm_name" className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Название фермы" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div className="row mb-5">
        <label className="label" htmlFor="farm-desc">Описание</label>
        <textarea id="farm-desc" name="description" className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="row">
          <label className="label" htmlFor="farm-lat">Широта</label>
          <input
            id="farm-lat"
            type="number"
            step="0.000001"
            className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            placeholder="55.75"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
        </div>
        <div className="row">
          <label className="label" htmlFor="farm-lng">Долгота</label>
          <input
            id="farm-lng"
            type="number"
            step="0.000001"
            className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            placeholder="37.62"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </div>
      </div>
      {geoNote && <div className="text-sm text-gray-500 mb-4">{geoNote}</div>}

      <div className="flex flex-row max-w-[500px]">
        <button className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] w-full transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left cursor-pointer bg-[#3E8D43]/17" type="submit" disabled={loading}>Создать</button>
        {onCancel && <button type="button" className="w-full px-4 py-2 rounded-lg bg-gray-200 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200" style={{ marginLeft: 8 }} onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}
