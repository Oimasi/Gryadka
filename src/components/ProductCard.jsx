// src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({ product, user, onOpen, onEdit, onDelete }) {
  const primary = (product.media && product.media.find(m => m.is_primary)) || null;
  const thumb = primary ? primary.presigned_url : null;

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 160, minWidth: 120 }}>
          {thumb ? <img src={thumb} alt={product.name} className="product-img" /> : <div style={{ width: 160, height: 100, background: "#f5f5f5", borderRadius:6 }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <b>{product.name}</b>
              <div className="small">{product.short_description}</div>
              <div className="small">Ферма: {product.farm_name || "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="small">ID: {product.id}</div>
              <div className="small">{product.is_active ? "Активен" : "Неактивен"}</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => onOpen(product)}>Открыть</button>
            {user && (user.role === "admin" || user.id === product.owner_id) && (
              <>
                <button className="btn" onClick={() => onEdit(product)} style={{ marginLeft: 8 }}>Редактировать</button>
                <button className="btn" onClick={() => onDelete(product)} style={{ marginLeft: 8 }}>Удалить</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
