// src/components/main/CreateSensorForm.jsx
import React, { useState, useEffect } from "react";
import { getMyProducts } from "../../api";

export default function CreateSensorForm({ user, onDone, onCancel, setMsg }) {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null); 

  useEffect(() => {
    async function loadProducts() {
      const r = await getMyProducts();
      if (r.ok) {
        setProducts(r.data || []);
        if (r.data && r.data.length > 0) {
          setProductId(String(r.data[0].id));
        }
      }
    }
    if (user?.role === "farmer") loadProducts();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    setApiKey(null);

    try {
   
      if (!productId || productId === "") {
        setMsg("Пожалуйста, выберите продукт для привязки датчика");
        setLoading(false);
        return;
      }

      const payload = {
        name: name.trim(),
        product_id: parseInt(productId, 10),
      };

      const res = await fetch("/api/sensors/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("gryadka_access_token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.detail || "Ошибка при создании датчика";
        setMsg(msg);
        setLoading(false);
        return;
      }

      if (data.api_key) {
        setApiKey(data.api_key);
      } else {
        setMsg("✅ Датчик создан, но API-ключ не получен");
        onDone?.(data);
      }
    } catch (err) {
      setMsg("Ошибка сети");
      console.error(err);
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey).then(() => {
        alert("Ключ скопирован в буфер обмена");
      }).catch(() => {
        alert("Не удалось скопировать. Выделите текст вручную и нажмите Ctrl+C");
      });
    }
  };

  return (
    <div className="border-1 p-7 border-gray-200 w-full rounded-3xl justify-center mx-auto max-w-[1300px]">
      <h3 className="text-xl font-semibold mb-4">Создать датчик</h3>

      {!apiKey ? (
        <form onSubmit={handleSubmit}>
          <div className="row mb-5">
            <label className="label" htmlFor="sensor-name">Название датчика *</label>
            <input
              id="sensor-name"
              type="text"
              className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Датчик в теплице №1"
            />
          </div>

          <div className="row mb-5">
            <label className="label" htmlFor="sensor-product">Привязать к продукту *</label>
            <select
              id="sensor-product"
              className="mt-2 w-full h-[48px] rounded-lg border-1 transition-all duration-150 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">— Выберите продукт —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: {p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-row max-w-[500px]">
            <button
              className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] w-full transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left cursor-pointer bg-[#3E8D43]/17"
              type="submit"
              disabled={loading}
            >
              {loading ? "Создание..." : "Создать датчик"}
            </button>
            {onCancel && (
              <button
                type="button"
                className="w-full px-4 py-2 rounded-lg bg-gray-200 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200"
                style={{ marginLeft: 8 }}
                onClick={onCancel}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <p className="text-lg font-medium text-green-700 mb-4">Датчик успешно создан!</p>
          <p className="mb-2">Ваш секретный <strong>API-ключ</strong>:</p>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={apiKey}
              className="w-full p-3 pr-12 font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-3 top-3 text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Копировать
            </button>
          </div>
          <p className="mt-4 text-sm text-red-600">
             <strong>Этот ключ больше не будет показан!</strong> Сохраните его сейчас.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                onDone?.();
                setApiKey(null);
              }}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}