// src/components/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { getProduct, fetchImageAsObjectURL, getPassport } from "../api";



// Стили компонента
const styles = {
  page: { maxWidth: 1100, margin: "20px auto", fontFamily: "Arial, Helvetica, sans-serif", color: "#222" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  title: { fontSize: 28, margin: 0 },
  sub: { color: "#666", marginTop: 6 },
  card: { background: "#fff", borderRadius: 8, padding: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  smallMetaRow: { display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" },
  metaBox: { background: "#f7f7f8", padding: 10, borderRadius: 6, minWidth: 160 },
  sectionTitle: { fontSize: 16, margin: "0 0 10px 0", color: "#333" },
  sensorGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 10 },
  sensorItem: { padding: 12, borderRadius: 8, border: "1px solid #eee", background: "#fcfcfc" },
  labelSmall: { fontSize: 12, color: "#666" },
  valLarge: { fontSize: 18, fontWeight: 600, marginTop: 6 },
  badge: (bg, color) => ({ display: "inline-block", padding: "4px 8px", borderRadius: 999, fontSize: 12, background: bg, color }),
  extraList: { marginTop: 8, display: "grid", gap: 6 },
  extraRow: { display: "flex", justifyContent: "space-between", padding: "8px", borderRadius: 6, background: "#fbfbfb", border: "1px solid #f0f0f0" },
  closeBtn: { background: "#1f2937", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }
};


// alignItems: 'stretch' чтобы обе колонки растягивались до одинаковой высоты
const topRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr minmax(220px, 320px)",
  gap: 16,
  alignItems: "stretch",
  marginTop: 14,
};

// контейнеры-обёртки — гарантируем, что карточки внутри займут 100% высоты ячейки
const descCardWrapperStyle = { display: "block", height: "100%" };
const photoCardWrapperStyle = {
  width: "100%",
  boxSizing: "border-box",
  flexShrink: 0,
  height: "100%"
};

const photoContainerStyle = {
  borderRadius: 8,
  overflow: "hidden",
  background: "#fafafa",
  padding: 8,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignItems: "stretch",
  height: "100%",
  justifyContent: "flex-start"
};

const thumbStyle = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  display: "block",
  borderRadius: 6,
  flex: "0 0 auto"
};

const thumbnailPlaceholderStyle = {
  width: "100%",
  height: 180,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#999",
  borderRadius: 6,
  background: "#f3f3f4",
  boxSizing: "border-box",
  padding: 8,
};

// Функция для отображения оценки
function ratingBadge(value) {
  if (!value) return <span style={styles.badge("#e6e6e6", "#333")}>—</span>;
  const v = String(value).toLowerCase();
  if (v.includes("хорош")) return <span style={styles.badge("#ecfdf5", "#065f46")}>{value}</span>;
  if (v.includes("средн")) return <span style={styles.badge("#fff7ed", "#92400e")}>{value}</span>;
  if (v.includes("плох")) return <span style={styles.badge("#fff1f2", "#9f1239")}>{value}</span>;
  return <span style={styles.badge("#f3f4f6", "#111827")}>{value}</span>;
}

// Форматирование даты и времени
function formatDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleString("ru-RU");
  return String(s);
}
function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleDateString("ru-RU");
  return String(s);
}
// Создание ссылки на карты из координат
function coordsToLink(s) {
  if (!s) return null;
  const m = String(s).trim();
  if (!m.includes(",")) return null;
  const [lat, lon] = m.split(",").map(x => x.trim());
  if (!lat || !lon) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}`;
}
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(n);
}

export default function ProductDetails({ productId, onClose, setMsg }) {
  const [product, setProduct] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(null);
  const [loadingImg, setLoadingImg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function load() {
      setLoading(true);
      try {
        const r = await getProduct(productId);
        if (!r || !r.ok) {
          setMsg && setMsg((r && (r.data?.detail || JSON.stringify(r.data))) || "Ошибка при получении товара");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setProduct(r.data);
        const passportRes = await getPassport(productId);
        if (!cancelled) setPassport(passportRes && passportRes.ok ? passportRes.data : null);

        const primary = (r.data.media && r.data.media.find(m => m.is_primary)) || null;
        if (primary) {
          if (primary.presigned_url) {
            if (objectUrl) {
              try { URL.revokeObjectURL(objectUrl); } catch (e) {}
              objectUrl = null;
            }
            if (!cancelled) setImgSrc(primary.presigned_url);
          } else if (primary.id) {
            setLoadingImg(true);
            try {
              const fetched = await fetchImageAsObjectURL(`/api/products/media/${primary.id}/file`);
              if (cancelled) {
                if (fetched && typeof fetched === "string" && fetched.startsWith("blob:")) {
                  try { URL.revokeObjectURL(fetched); } catch (e) {}
                }
                return;
              }
              if (fetched) {
                objectUrl = fetched;
                setImgSrc(objectUrl);
              } else {
                setImgSrc(null);
              }
            } catch (e) {
              if (!cancelled) setImgSrc(null);
            } finally {
              if (!cancelled) setLoadingImg(false);
            }
          } else {
            if (!cancelled) setImgSrc(null);
          }
        } else {
          if (!cancelled) setImgSrc(null);
        }
      } catch (e) {
        setMsg && setMsg("Ошибка сети");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (productId) load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        objectUrl = null;
      }
    };

  }, [productId]);

  if (loading) return <div style={styles.page}>Загрузка...</div>;
  if (!product) return <div style={styles.page}>Товар не найден</div>;

  const data = passport?.data || {};
  const sensorKeys = new Set([
    "Есть датчики",
    "Средний pH за время выращивания",
    "% измерений pH вне допустимого диапазона",
    "Оценка pH",
    "Последняя соленость почвы",
    "Средняя соленость почвы за время выращивания",
    "Оценка солености почвы",
    "Средняя температура за время выращивания",
    "Наличие резких перепадов температуры",
    "Время сбора урожая",
    "Чем измерялись данные",
    "Дата последней калибровки pH-электродов",
    "Фото площадки от шлюза",
    "Местоположение точки ( координаты участка)",
    "Последние значимые алерты",
    "Краткая рекомендация от ИИ"
  ]);
  const coordsLink = coordsToLink(data["Местоположение точки ( координаты участка)"]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>{product.name}</h1>
          <div style={styles.sub}>
            ID: {product.id} • Ферма: {product.farm_name || "—"} • <strong style={{ marginLeft: 6 }}>{formatPrice(product.price)}</strong>
          </div>
        </div>
        <div>
          <button onClick={onClose} style={styles.closeBtn}>Закрыть</button>
        </div>
      </div>

      <div style={topRowStyle}>
        <div style={descCardWrapperStyle}>
          <div style={{ ...styles.card, height: "100%", display: "flex", flexDirection: "column" }}>
            <h3 style={styles.sectionTitle}>Краткое описание</h3>
            <div style={{ color: "#444", lineHeight: 1.45, flex: "1 1 auto" }}>
              {product.short_description || "—"}
            </div>

            <div style={{ ...styles.smallMetaRow, marginTop: "auto" }}>
              <div style={styles.metaBox}>
                <div style={styles.labelSmall}>Дата сбора (паспорт)</div>
                <div style={styles.valLarge}>{passport?.harvest_date ? formatDate(passport.harvest_date) : "—"}</div>
              </div>

              <div style={styles.metaBox}>
                <div style={styles.labelSmall}>Есть датчики</div>
                <div style={{ marginTop: 6 }}>
                  {data["Есть датчики"]
                    ? <span style={styles.badge("#ecfdf5", "#065f46")}>Да</span>
                    : <span style={styles.badge("#f3f4f6", "#6b7280")}>Нет</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={photoCardWrapperStyle}>
          <div style={{ ...styles.card, ...photoContainerStyle }}>
            <div>
              {imgSrc ? (
                <img src={imgSrc} alt={product.name} style={thumbStyle} />
              ) : (
                <div style={thumbnailPlaceholderStyle}>{loadingImg ? "Загрузка фотографии..." : "Нет фото"}</div>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              <div style={styles.labelSmall}>Местоположение</div>
              {data["Местоположение точки ( координаты участка)"] ? (
                <div className="product-location" style={{ marginTop: 6 }}>
                  {coordsLink ? (
                    <a href={coordsLink} target="_blank" rel="noreferrer" style={{ color: "#0b5cff", textDecoration: "none", fontWeight: 600 }}>
                      {data["Местоположение точки ( координаты участка)"]}
                    </a>
                  ) : (
                    <div style={{ fontWeight: 600 }}>{data["Местоположение точки ( координаты участка)"]}</div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 6, color: "#666" }}>—</div>
              )}
            </div>

            <div style={{ marginTop: 6 }}>
              <div style={styles.labelSmall}>Фото от шлюза</div>
              <div style={{ marginTop: 6 }} className="product-side-text">{data["Фото площадки от шлюза"] || "Нет фото"}</div>
            </div>
          </div>
        </div>
      </div>

      {data["Есть датчики"] && (
        <div style={{ ...styles.card, marginTop: 14 }}>
          <h3 style={styles.sectionTitle}>Данные с датчиков</h3>
          <div style={styles.sensorGrid}>
            <div style={styles.sensorItem}>
              <div style={styles.labelSmall}>Средний pH</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={styles.valLarge}>{data["Средний pH за время выращивания"] ?? "—"}</div>
                <div>{ratingBadge(data["Оценка pH"])}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>% вне диапазона: <strong>{data["% измерений pH вне допустимого диапазона"] ?? "—"}</strong></div>
            </div>

            <div style={styles.sensorItem}>
              <div style={styles.labelSmall}>Соленость почвы</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={styles.valLarge}>{data["Последняя соленость почвы"] ?? "—"}</div>
                <div>{ratingBadge(data["Оценка солености почвы"])}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>Средняя: <strong>{data["Средняя соленость почвы за время выращивания"] ?? "—"}</strong></div>
            </div>

            <div style={styles.sensorItem}>
              <div style={styles.labelSmall}>Температура</div>
              <div style={styles.valLarge}>{data["Средняя температура за время выращивания"] ? `${data["Средняя температура за время выращивания"]} °C` : "—"}</div>
              <div style={{ marginTop: 8 }}>{data["Наличие резких перепадов температуры"] === "Да"
                ? <span style={styles.badge("#fff1f2", "#9f1239")}>Есть резкие перепады</span>
                : <span style={styles.badge("#ecfdf5", "#065f46")}>Перепадов нет</span>}</div>
            </div>

            <div style={styles.sensorItem}>
              <div style={styles.labelSmall}>Время сбора урожая (по данным)</div>
              <div style={{ marginTop: 6 }}>{formatDateTime(data["Время сбора урожая"])}</div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
                <div>Калибровка pH-электродов: <strong>{data["Дата последней калибровки pH-электродов"] ? formatDate(data["Дата последней калибровки pH-электродов"]) : "—"}</strong></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                <div style={styles.labelSmall}>Чем измерялись данные</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>{data["Чем измерялись данные"] || "garsen v1.0.0"}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                <div style={styles.labelSmall}>Последние значимые алерты</div>
                <div style={{ marginTop: 6 }}>{data["Последние значимые алерты"] || "—"}</div>
              </div>

              <div style={{ padding: 10, borderRadius: 8, background: "#fff", border: "1px solid #eee" }}>
                <div style={styles.labelSmall}>Краткая рекомендация от ИИ</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{data["Краткая рекомендация от ИИ"] || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, marginTop: 14 }}>
        <h3 style={styles.sectionTitle}>Доп. параметры</h3>
        <div style={styles.extraList}>
          {Object.entries(data).filter(([k]) => !sensorKeys.has(k)).length === 0 ? (
            <div style={{ color: "#666" }}>Нет дополнительных параметров</div>
          ) : (
            Object.entries(data).filter(([k]) => !sensorKeys.has(k)).map(([k, v]) => (
              <div key={k} style={styles.extraRow}><div style={{ color: "#444" }}>{k}</div><div style={{ fontWeight: 600 }}>{String(v)}</div></div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
