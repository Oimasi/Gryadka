// src/components/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { getProduct } from "../api";
import { getPassport } from "../api"; // Добавляем импорт

export default function ProductDetails({ productId, onClose, setMsg }) {
  const [p, setP] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await getProduct(productId);
      if (r.ok) {
        setP(r.data);
        
        // Загружаем паспорт
        const passportRes = await fetchWithAuth(`${ENDPOINTS.PRODUCTS}/${productId}/passport`);
        if (passportRes.ok) {
          setPassport(await passportRes.json());
        } else {
          setPassport(null);
        }
      } else {
        setMsg && setMsg((r.data && (r.data.detail || JSON.stringify(r.data))) || "Ошибка при получении товара");
      }
    } catch (e) {
      setMsg && setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productId) load();
  }, [productId]);

  if (loading) return <div>Загрузка...</div>;
  if (!p) return <div>Товар не найден</div>;

  const primary = (p.media && p.media.find(m => m.is_primary)) || null;

  return (
    <div className="form">
      <h3>{p.name}</h3>
      <div className="small">ID: {p.id}</div>
      <div className="small">Ферма: {p.farm_name || "—"}</div>
      
      <div style={{ marginTop: 12 }}>
        <h4>Описание</h4>
        <div>{p.short_description}</div>
      </div>
      
      <div style={{ marginTop: 12 }}>
        <h4>Паспорт товара</h4>
        
        {passport ? (
          <div>
            {passport.origin && (
              <div className="row">
                <b>Происхождение:</b> {passport.origin}
              </div>
            )}
            
            {passport.variety && (
              <div className="row">
                <b>Сорт/вид:</b> {passport.variety}
              </div>
            )}
            
            {passport.harvest_date && (
              <div className="row">
                <b>Дата сбора:</b> {new Date(passport.harvest_date).toLocaleDateString('ru-RU')}
              </div>
            )}
            
            {passport.certifications && passport.certifications.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <b>Сертификаты:</b>
                <div style={{ marginTop: 5 }}>
                  {passport.certifications.map((cert, index) => (
                    <div key={index} className="card" style={{ padding: 10, marginBottom: 8 }}>
                      <div><b>{cert.name}</b></div>
                      <div className="small">Выдан: {cert.issuer}</div>
                      <div className="small">Дата: {cert.date ? new Date(cert.date).toLocaleDateString('ru-RU') : ''}</div>
                      {cert.notes && <div className="small">Примечания: {cert.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(passport.data).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <b>Дополнительные данные:</b>
                <div style={{ marginTop: 5 }}>
                  {Object.entries(passport.data).map(([key, value]) => (
                    <div key={key} className="row" style={{ marginBottom: 5 }}>
                      <b>{key}:</b> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="small" style={{ color: "#666" }}>
            Паспорт товара не заполнен
          </div>
        )}
      </div>
      
      <div style={{ marginTop: 8 }}>
        {primary ? <img src={primary.presigned_url} alt={p.name} style={{ maxWidth: "100%", height: "auto", borderRadius: 6 }} /> : <div style={{ height: 160, background: "#f7f7f7", borderRadius:6 }} />}
      </div>
      
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}