// src/components/ProductCard.jsx
import React, { useEffect, useState } from "react";
import { fetchImageAsObjectURL } from "../api";


// Фиксированный размер миниатюры
const THUMB_SIZE_PX = 140; 

// Стили для контейнера миниатюры
const thumbContainerStyle = {
  width: THUMB_SIZE_PX,
  minWidth: THUMB_SIZE_PX,
  height: THUMB_SIZE_PX,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  overflow: "hidden",
  background: "#f5f5f5",
  flexShrink: 0,
};

// Стили для изображения
const imgStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover", 
  display: "block",
  borderRadius: 8,
};

// Стили для текста-заполнителя
const placeholderTextStyle = {
  color: "#999",
  fontSize: 13,
  textAlign: "center",
  padding: 6,
};

export default function ProductCard({ product, user, onOpen, onEdit, onDelete }) {
  // Определение основного изображения продукта
  const primary = (product.media && product.media.find(m => m.is_primary)) || null;
  const thumbPresigned = primary ? primary.presigned_url : null;
  const mediaId = primary ? primary.id : null;

  // Состояния для управления изображением
  const [imgSrc, setImgSrc] = useState(thumbPresigned || null);
  const [loadingImg, setLoadingImg] = useState(false);

  // Загрузка изображения
  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    async function loadFallback() {
      // если есть presigned url — используем напрямую
      if (thumbPresigned) {
        if (mounted) setImgSrc(thumbPresigned);
        return;
      }
      if (!mediaId) {
        if (mounted) setImgSrc(null);
        return;
      }

      setLoadingImg(true);
      try {
        const obj = await fetchImageAsObjectURL(`/api/products/media/${mediaId}/file`);
        if (!mounted) {
          if (obj) URL.revokeObjectURL(obj);
          return;
        }
        if (obj) {
          objectUrl = obj;
          setImgSrc(objectUrl);
        } else {
          setImgSrc(null);
        }
      } catch (e) {
        if (mounted) setImgSrc(null);
      } finally {
        if (mounted) setLoadingImg(false);
      }
    }

    loadFallback();

    // Очистка при размонтировании компонента
    return () => {
      mounted = false;
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) { /* ignore */ }
      }
    };
  }, [thumbPresigned, mediaId]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Контейнер для миниатюры */}
        <div style={thumbContainerStyle} aria-hidden={imgSrc ? "false" : "true"}>
          {imgSrc ? (
            // используем inline-стили чтобы не ломать глобальную стилизацию и избежать правок styles.css
            <img src={imgSrc} alt={product.name || "product"} style={imgStyle} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={placeholderTextStyle}>
                {loadingImg ? "Загрузка..." : "Нет фото"}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              {/* Название продукта */}
              <b>{product.name}</b>
              {/* Короткое описание */}
              <div className="small short-desc" title={product.short_description || ""} style={{ marginTop: 6 }}>
                {product.short_description || "—"}
              </div>
              {/* Название фермы */}
              <div className="small" style={{ marginTop: 8 }}>Ферма: {product.farm_name || "—"}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              {/* ID продукта */}
              <div className="small">ID: {product.id}</div>
              {/* Статус активности */}
              <div className="small">{product.is_active ? "Активен" : "Неактивен"}</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            {/* Кнопки действий */}
            <div className="product-actions">
              <button className="btn action-btn" onClick={() => onOpen && onOpen(product)}>Открыть</button>
              {user && (user.role === "admin" || user.id === product.owner_id) && (
                <>
                  <button className="btn action-btn" onClick={() => onEdit && onEdit(product)}>Редактировать</button>
                  <button className="btn action-btn" onClick={() => onDelete && onDelete(product)}>Удалить</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
