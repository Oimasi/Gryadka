import React, { useEffect, useState } from "react";
import { getProduct, fetchImageAsObjectURL, getPassport } from "../../api";
import discount from "/images/discount.svg"
import { Footer } from "./Footer";
import { addItem } from "../../hooks/useCart";

function ratingBadge(value) {
  if (!value) return <span className="inline-block px-2 py-1 rounded-full text-sm bg-gray-200 text-gray-800">—</span>;
  const v = String(value).toLowerCase();
  if (v.includes("хорош")) return <span className="inline-block px-3 font-medium py-1 rounded-full text-sm bg-[#3E8D43]/10 text-[#3E8D43]">{value}</span>;
  if (v.includes("средн")) return <span className="inline-block px-3 font-medium py-1 rounded-full text-sm bg-[#ca6200]/10 text-[#ca6200]">{value}</span>;
  if (v.includes("плох")) return <span className="inline-block px-2 py-1 rounded-full text-sm bg-rose-50 text-rose-700">{value}</span>;
  return <span className="inline-block px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800">{value}</span>;
}

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
function coordsToLink(s) {
  if (!s) return null;
  const m = String(s).trim();
  if (!m.includes(",")) return null;
  const [lat, lon] = m.split(",").map(x => x.trim());
  if (!lat || !lon) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}`;
}

export default function ProductDetails({ productId, onClose, setMsg }) {
  const [qty, setQty] = useState(0);
  const [product, setProduct] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(null);
  const [loadingImg, setLoadingImg] = useState(false);

  function handleAdd() {
    const next = Math.max(1, qty + 1);
    setQty(next);
    addItem(product, 1);
    try { window.toast?.("Добавлено в корзину"); } catch {}
  }

  function changeQty(delta) {
    const next = Math.max(0, qty + delta);
    setQty(next);
    addItem(product, delta);
  }

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

  if (loading) return <div className="max-w-6xl mx-auto p-6">Загрузка...</div>;
  if (!product) return <div className="max-w-6xl mx-auto p-6">Товар не найден</div>;

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

  function renderStars() {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.447a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.37 2.447c-.785.57-1.84-.197-1.54-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.643 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
            </svg>
          ))}
        </div>
        <div className="text-sm text-gray-500">{product.reviews_count || 15} оценок</div>
      </div>
    );
  }

  function formatPrice(p) {
    if (p == null) return "—";
    if (typeof p === "number") return p.toLocaleString("ru-RU") + " ₽";
    if (!isNaN(Number(p))) return Number(p).toLocaleString("ru-RU") + " ₽";
    return String(p) + " ₽";
  }

  const oldPrice = product.old_price ?? product.price_old ?? null;
  const mainPrice = product.price ?? product.price_value ?? product?.price?.amount ?? null;

  return (
    <div className="max-w-[1330px] mx-auto px-4 py-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[#A8A8A8]"><span className="text-[#A8A8A8] cursor-pointer" onClick={() => onNavigate("main")}>Главная ·</span> Категории · <span className="text-black">{product.category || "—"}</span></h3>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row w-full gap-8">
        <div className="lg:col-span-7 w-full">
          <div className="flex-col lg:flex-row flex w-full">
            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-white rounded-[20px] p-6 mr-0 lg:mr-40 pl-0 lg:pl-34 flex items-center justify-center">
                {imgSrc ? (
                  <img src={imgSrc} alt={product.name} className="w-full max-h-[520px] object-contain" />
                ) : (
                  <div className="w-full h-[520px] flex items-center justify-center text-gray-400">{loadingImg ? "Загрузка фотографии..." : "Нет фото"}</div>
                )}
              </div>
            </div>
          <div className="ml-0 lg:col-span-5">
            <div className="top-6">
              <p className="text-[16px] text-[#3E8D43]">{product.farm_name || "Ферма"}</p>
              <p className="text-2xl font-bold mt-1">{product.name}</p>
              <p className="mt-3">{renderStars()}</p>
              <div className="mt-6 flex items-end gap-4 bg-[#F7F7F7] rounded-[20px] p-6">
                <div className="flex flex-col w-full">
                  <div className="flex flex-row justify-between w-full gap-auto">
                    <div>
                      <div className="flex flex-row">
                        <p className="text-xl md:text-3xl font-semibold text-black">{formatPrice(mainPrice)}</p>
                      </div>
                      {oldPrice && <p className="text-sm text-gray-400 line-through mt-1">{formatPrice(oldPrice)}</p>}
                      <p className="text-[16px] text-gray-500 mt-0">{formatPrice(mainPrice)}/кг</p>
                    </div>
                   <div className="flex flex-col items-center">
                      {qty === 0 ? (
                        <button onClick={() => handleAdd()} className="bg-[#3E8D43] text-white px-10 md:px-16 cursor-pointer py-3 rounded-[12px] font-semibold hover:bg-[#3E8D43]/70 active:bg-[#3E8D43]/60 transition-all duration-150" >
                          В корзину
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={() => changeQty(-1)} className="px-5 py-2 bg-gray-200 rounded-md text-lg font-semibold transition-all duration-150 cursor-pointer hover:bg-gray-200/40">
                            −
                          </button>
                          <span className="text-lg font-semibold w-6 text-center">{qty}</span>
                          <button onClick={() => changeQty(1)} className="px-5 py-2 bg-gray-200 rounded-md text-lg font-semibold transition-all duration-150 cursor-pointer hover:bg-gray-200/40">
                            +
                          </button>
                        </div>
                      )}
                      <p className="mt-2 text-sm text-center text-gray-500">В наличии много</p>
                    </div>
                  </div>
                  <div className="border-t w-full mt-4 border-[#CCCCCC]">
                    <p className="mt-3 text-sm text-[#3E8D43] flex gap-3">
                      Доставка за 30 мин, 80 ₽
                    </p>
                  </div>
                </div>
                </div>

                <div className="mt-4 bg-[#3E8D43]/20 rounded-[20px] p-6 text-[16px] text-black">
                  <img src={discount} />
                  <p className="mt-4">Промокод GRYADKA на доставку в вашем городе — скидка 500 рублей на первый заказ.</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="bg-[#F7F7F7] rounded-[20px] p-6">
                  <h4 className="text-[18px] text-black font-medium mb-2">Паспорт товара</h4>
                  <p className="text-[15px] text-gray-500">Происхождение: <span className="text-black">{passport?.origin || "-"}</span></p>
                  <p className="text-[15px] text-gray-500 mt-1">Сорт / вид: <span className="text-black">{passport?.variety || "-"}</span></p>
                  <p className="text-[15px] text-gray-500 mt-1">Дата сбора: <span className="text-black">{formatDate(passport.harvest_date)}</span></p>
                  <p className="text-[15px] text-gray-500 mt-1">Артикул: <span className="text-black">{product.id}</span></p>
                  <p className="text-[15px] text-gray-500 mt-1">
                    {data["Местоположение точки ( координаты участка)"] ? (
                      coordsLink ? (
                        <a href={coordsLink} target="_blank" rel="noreferrer" className="text-[15px]">Местоположение: <span className="text-black">{data["Местоположение точки ( координаты участка)"]}</span></a>
                      ) : (
                        <div className="text-[15px]">Местоположение: <span className="text-black">{data["Местоположение точки ( координаты участка)"]}</span></div>
                      )
                    ) : (
                      <div className="text-[15px] text-gray-500"></div>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-[18px] font-medium text-black mt-6 mb-2">Краткое описание</h3>
          <div className="text-gray-700 text-[15px] leading-relaxed">{product.short_description || "—"}</div>

          <div className="mt-6 flex items-center gap-3">
            <div className="text-[18px] font-medium text-black">Пищевая ценность на 100г</div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border-gray-300 border-1 rounded-[20px] p-3 text-center">
              <div className="text-2xl font-semibold">120.0</div>
              <div className="text-sm text-gray-500 mt-1">Калории</div>
            </div>
            <div className="border-gray-300 border-1 rounded-[20px] p-3 text-center">
              <div className="text-2xl font-semibold">12.0</div>
              <div className="text-sm text-gray-500 mt-1">Белки</div>
            </div>
            <div className="border-gray-300 border-1 rounded-[20px] p-3 text-center">
              <div className="text-2xl font-semibold">8.0</div>
              <div className="text-sm text-gray-500 mt-1">Жиры</div>
            </div>
            <div className="border-gray-300 border-1 rounded-[20px] p-3 text-center">
              <div className="text-2xl font-semibold">0.8</div>
              <div className="text-sm text-gray-500 mt-1">Углеводы</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="text-[18px] font-medium text-black">Качество и контроль</div>
          </div>

          <div className="w-full">
            <div>
              <div className="mt-6 gap-4 grid w-full grid-cols-1 md:grid-cols-3">
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Дата сбора (паспорт)</div>
                  <div className="text-black font-medium mt-6">{passport?.harvest_date ? formatDate(passport.harvest_date) : "—"}</div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Есть датчики</div>
                  <div className="font-medium mt-6">{data["Есть датчики"] ? <span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span> : <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Нет</span>}</div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Прошел сертификацию</div>
                  <div className="font-medium mt-6"><span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span></div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Контроль температуры</div>
                  <div className="font-medium mt-6"><span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span></div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Контроль влажности</div>
                  <div className="font-medium mt-6"><span className="inline-block bg-[#ca6200]/10 text-[#ca6200] px-3 py-1 rounded-full">Частично</span></div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Оборудование</div>
                  <div className="font-medium mt-6"><span className="inline-block text-black">{data["Чем измерялись данные"] || "garsen v1.0.0"}</span></div>
                </div>
              </div>
              
            </div>
          </div>

          {data["Есть датчики"] && (
            <div>
              <div className="mt-6 flex items-center gap-3">
                <div className="text-[18px] font-medium text-black">Данные с датчиков</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#F7F7F7] rounded-[20px] h-35 px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Средний pH</div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-2xl font-semibold">{data["Средний pH за время выращивания"] ?? "—"}</div>
                    <div>{ratingBadge(data["Оценка pH"])}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">% вне диапазона: <strong>{data["% измерений pH вне допустимого диапазона"] ?? "—"}</strong></div>
                </div>

                <div className="bg-[#F7F7F7] rounded-[20px] h-35 px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Соленость почвы</div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-2xl font-semibold">{data["Последняя соленость почвы"] ?? "—"}</div>
                    <div>{ratingBadge(data["Оценка солености почвы"])}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Средняя: <strong>{data["Средняя соленость почвы за время выращивания"] ?? "—"}</strong></div>
                </div>

                <div className="bg-[#F7F7F7] rounded-[20px] h-35 px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Температура</div>
                  <div className="flex flex-row justify-between gap-auto mt-12">
                    <div className="text-2xl font-semibold mt-2">{data["Средняя температура за время выращивания"] ? `${data["Средняя температура за время выращивания"]} °C` : "—"}</div>
                    <div className="mt-2 font-medium text-sm">{data["Наличие резких перепадов температуры"] === "Да" ? <span className="inline-block bg-rose-50 text-rose-700 px-3 py-1 rounded-full">Есть резкие перепады</span> : <span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Перепадов нет</span>}</div>
                  </div>
                </div>

                <div className="bg-[#F7F7F7] rounded-[20px] h-35 px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Время сбора урожая (по данным)</div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-2xl font-semibold">{formatDateTime(data["Время сбора урожая"])}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Калибровка pH-электродов: <strong>{data["Дата последней калибровки pH-электродов"] ? formatDate(data["Дата последней калибровки pH-электродов"]) : "—"}</strong></div>
                </div>                
              </div>

              <div className="mt-4 flex grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Последние значимые алерты</div>
                  <div className="flex flex-row justify-between gap-auto mt-6">
                    <div className="mt-2 font-medium">{data["Последние значимые алерты"] || "—"}</div>
                  </div>
                </div>
                <div className="bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Используется капельный полив</div>
                  <div className="flex flex-row justify-between gap-auto mt-6">
                    <div className="mt-2 font-medium">Да</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="text-[18px] font-medium text-black">Краткая рекомендация от ИИ</div>
              </div>
              <div className="mt-6 bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                  <div className="text-sm text-gray-500">Gryadka AI</div>
                  <div className="flex flex-row justify-between gap-auto mt-6">
                    <div className="mt-2 font-medium">{data["Краткая рекомендация от ИИ"] || "—"}</div>
                  </div>
              </div>
              
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[18px] font-medium text-black">Дополнительные параметры</div>
        <div className="grid gap-2">
          {Object.entries(data).filter(([k]) => !sensorKeys.has(k)).length === 0 ? (
            <div className="text-gray-500 text-md mt-2">Нет дополнительных параметров</div>
          ) : (
            Object.entries(data).filter(([k]) => !sensorKeys.has(k)).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-[#F7F7F7] rounded-[20px] px-6 py-4 w-full">
                <div className="text-gray-700">{k}</div>
                <div className="font-medium">{String(v)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="mt-20">
        <Footer />
      </div>
    </div>
  );
}
