import React, { useEffect, useState, useRef } from "react";
import { getProduct, fetchImageAsObjectURL, getPassport } from "../../api";
import logo from "/images/logotype.png";

// Утилиты форматирования
function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("ru-RU", { timeZone: 'Europe/Moscow' });
}

function formatDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString("ru-RU", { timeZone: 'Europe/Moscow' });
}

function ratingBadge(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v.includes("хорош")) return <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[#3E8D43]/15 text-[#3E8D43]">{value}</span>;
  if (v.includes("средн")) return <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">{value}</span>;
  if (v.includes("плох")) return <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700">{value}</span>;
  return <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{value}</span>;
}

function coordsToLink(s) {
  if (!s) return null;
  const m = String(s).trim();
  if (!m.includes(",")) return null;
  const [lat, lon] = m.split(",").map(x => x.trim());
  if (!lat || !lon) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}`;
}

// Анимированная секция с IntersectionObserver
function AnimatedSection({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}

// Компонент листочка для декора
function LeafDecor({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
    </svg>
  );
}

// Компонент звёзд рейтинга
function Stars({ count = 5, filled = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < filled ? "text-amber-400" : "text-gray-300"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.447a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.37 2.447c-.785.57-1.84-.197-1.54-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.643 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductQRPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax эффект
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Загрузка данных
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function load() {
      setLoading(true);
      try {
        const r = await getProduct(productId);
        if (!r || !r.ok || cancelled) {
          setLoading(false);
          return;
        }

        setProduct(r.data);

        // Загружаем паспорт
        const passportRes = await getPassport(productId);
        if (!cancelled) setPassport(passportRes?.ok ? passportRes.data : null);

        // Загружаем изображение
        const primary = r.data.media?.find(m => m.is_primary) || r.data.media?.[0];
        if (primary) {
          if (primary.presigned_url) {
            if (!cancelled) setImgSrc(primary.presigned_url);
          } else if (primary.id) {
            const fetched = await fetchImageAsObjectURL(`/api/products/media/${primary.id}/file`);
            if (cancelled) {
              if (fetched?.startsWith("blob:")) URL.revokeObjectURL(fetched);
              return;
            }
            if (fetched) {
              objectUrl = fetched;
              setImgSrc(objectUrl);
            }
          }
        }
      } catch (e) {
        console.error("Ошибка загрузки:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (productId) load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [productId]);

  // Анимация появления hero после загрузки
  useEffect(() => {
    if (!loading) {
      setTimeout(() => setHeroLoaded(true), 100);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f7f0] to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#3E8D43]/20 rounded-full animate-spin border-t-[#3E8D43]" />
            <img src={logo} alt="Gryadka" className="w-8 h-6 object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-[#3E8D43] font-medium animate-pulse">Загружаем...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f7f0] to-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🥬</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Товар не найден</h1>
          <p className="text-gray-500 mb-6">Возможно, он был удалён или ссылка устарела</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-[#3E8D43] text-white px-6 py-3 rounded-full font-medium hover:bg-[#357a3a] transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    );
  }

  const data = passport?.data || {};
  const coordsLink = coordsToLink(data["Местоположение точки ( координаты участка)"]);
  const hasActiveSensors = (product?.sensor_devices || []).some(s => s.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7f0] via-white to-[#f8faf8] overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[400px] max-h-[600px] overflow-hidden">
        {/* Фоновое изображение с parallax */}
        <div
          className="absolute inset-0 transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.name}
              className={`w-full h-[120%] object-cover transition-all duration-1000 ${
                heroLoaded ? "scale-100 opacity-100" : "scale-110 opacity-0"
              }`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#3E8D43]/20 to-[#a8d5a0]/30 flex items-center justify-center">
              <span className="text-8xl opacity-50">🌱</span>
            </div>
          )}
        </div>

        {/* Градиентный оверлей */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Декоративные элементы */}
        <div className={`absolute top-6 right-6 transition-all duration-700 delay-500 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <img src={logo} alt="Gryadka" className="w-6 h-5 object-contain" />
            <span className="text-sm font-medium text-[#3E8D43]">Сертифицировано Gryadka</span>
          </div>
        </div>

        {/* Контент Hero */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10">
          <div className={`transition-all duration-700 delay-200 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#a8d5a0] text-sm font-medium">{product.farm_name || "Ферма"}</span>
              {product.category && (
                <>
                  <span className="text-white/50">•</span>
                  <span className="text-white/70 text-sm">{product.category}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-3">
              <Stars filled={5} />
              <span className="text-white/70 text-sm">{product.reviews_count || 15} оценок</span>
            </div>
          </div>
        </div>

        {/* Волна внизу */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto">
            <path
              d="M0 50C240 90 480 10 720 50C960 90 1200 30 1440 50V100H0V50Z"
              fill="url(#wave-gradient)"
            />
            <defs>
              <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f7f0" />
                <stop offset="100%" stopColor="white" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Контент */}
      <div className="px-5 pb-10 -mt-4 relative z-10">
        {/* Краткое описание */}
        {product.short_description && (
          <AnimatedSection delay={0} className="mb-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#3E8D43]/10">
              <p className="text-gray-700 leading-relaxed">{product.short_description}</p>
            </div>
          </AnimatedSection>
        )}

        {/* Паспорт товара */}
        <AnimatedSection delay={100} className="mb-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#3E8D43]/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#3E8D43]/10 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Паспорт товара</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Происхождение</span>
                <span className="font-medium text-gray-900">{passport?.origin || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Сорт / вид</span>
                <span className="font-medium text-gray-900">{passport?.variety || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Дата сбора</span>
                <span className="font-medium text-gray-900">{formatDate(passport?.harvest_date)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Артикул</span>
                <span className="font-medium text-gray-900 text-sm">{product.id}</span>
              </div>
              {coordsLink && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 text-sm">Местоположение</span>
                  <a
                    href={coordsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3E8D43] font-medium text-sm flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    На карте
                  </a>
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* Качество и контроль */}
        <AnimatedSection delay={200} className="mb-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#3E8D43]/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#3E8D43]/10 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Качество и контроль</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#f8faf8] rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-1">Датчики</div>
                <div className={`text-sm font-medium ${hasActiveSensors ? "text-[#3E8D43]" : "text-gray-600"}`}>
                  {hasActiveSensors ? "✓ Подключены" : "Нет"}
                </div>
              </div>
              <div className="bg-[#f8faf8] rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-1">Сертификация</div>
                <div className="text-sm font-medium text-[#3E8D43]">✓ Пройдена</div>
              </div>
              <div className="bg-[#f8faf8] rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-1">Температура</div>
                <div className="text-sm font-medium text-[#3E8D43]">✓ Контроль</div>
              </div>
              <div className="bg-[#f8faf8] rounded-2xl p-4">
                <div className="text-xs text-gray-500 mb-1">Влажность</div>
                <div className="text-sm font-medium text-[#3E8D43]">✓ Контроль</div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Данные с датчиков (для выросшего продукта) */}
        {data["Есть датчики"] && (
          <AnimatedSection delay={300} className="mb-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#3E8D43]/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#3E8D43]/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Данные с датчиков</h2>
              </div>

              <div className="space-y-4">
                {/* pH */}
                <div className="bg-gradient-to-r from-[#f0f7f0] to-[#e8f5e8] rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-gray-500">Средний pH</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {data["Средний pH за время выращивания"] ?? "—"}
                      </div>
                    </div>
                    {ratingBadge(data["Оценка pH"])}
                  </div>
                  {data["% измерений pH вне допустимого диапазона"] && (
                    <div className="text-xs text-gray-500">
                      Вне диапазона: <span className="font-medium text-gray-700">{data["% измерений pH вне допустимого диапазона"]}</span>
                    </div>
                  )}
                </div>

                {/* Соленость */}
                <div className="bg-gradient-to-r from-[#f0f7f0] to-[#e8f5e8] rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-gray-500">Соленость почвы</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {data["Последняя соленость почвы"] ?? "—"}
                      </div>
                    </div>
                    {ratingBadge(data["Оценка солености почвы"])}
                  </div>
                  {data["Средняя соленость почвы за время выращивания"] && (
                    <div className="text-xs text-gray-500">
                      Средняя: <span className="font-medium text-gray-700">{data["Средняя соленость почвы за время выращивания"]}</span>
                    </div>
                  )}
                </div>

                {/* Температура */}
                <div className="bg-gradient-to-r from-[#f0f7f0] to-[#e8f5e8] rounded-2xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">Средняя температура</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {data["Средняя температура за время выращивания"] ? `${data["Средняя температура за время выращивания"]}°C` : "—"}
                      </div>
                    </div>
                    <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                      data["Наличие резких перепадов температуры"] === "Да" 
                        ? "bg-rose-100 text-rose-700" 
                        : "bg-[#3E8D43]/10 text-[#3E8D43]"
                    }`}>
                      {data["Наличие резких перепадов температуры"] === "Да" ? "Были перепады" : "Стабильно"}
                    </div>
                  </div>
                </div>

                {/* Время сбора */}
                {data["Время сбора урожая"] && (
                  <div className="bg-gradient-to-r from-[#f0f7f0] to-[#e8f5e8] rounded-2xl p-4">
                    <div className="text-xs text-gray-500">Время сбора урожая</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {formatDateTime(data["Время сбора урожая"])}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Рекомендация от ИИ */}
        {data["Краткая рекомендация от ИИ"] && (
          <AnimatedSection delay={400} className="mb-6">
            <div className="bg-gradient-to-br from-[#3E8D43] to-[#2d6b31] rounded-3xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">✨</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Рекомендация от Gryadka AI</h2>
              </div>
              <p className="text-white/90 leading-relaxed">{data["Краткая рекомендация от ИИ"]}</p>
            </div>
          </AnimatedSection>
        )}

        {/* Сертификаты */}
        {(passport?.certifications?.length > 0 || product?.certifications?.length > 0) && (
          <AnimatedSection delay={500} className="mb-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#3E8D43]/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#3E8D43]/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Сертификаты</h2>
              </div>

              <div className="space-y-3">
                {(passport?.certifications || product?.certifications || []).map((cert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#f8faf8] rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3E8D43]/20 to-[#a8d5a0]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#3E8D43]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.5 5.5L20 8l-4 3 1 6L12 14l-5 3 1-6L4 8l5.5-.5L12 2z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{cert.name || "Сертификат"}</div>
                      {cert.issuer && <div className="text-xs text-gray-500 truncate">{cert.issuer}</div>}
                    </div>
                    {cert.date && (
                      <div className="text-xs text-gray-400 flex-shrink-0">{formatDate(cert.date)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* CTA кнопка */}
        <AnimatedSection delay={600} className="mt-8">
          <a
            href={`/product/${productId}`}
            className="block w-full bg-gradient-to-r from-[#3E8D43] to-[#4a9f50] text-white text-center py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg shadow-[#3E8D43]/30 hover:shadow-xl hover:shadow-[#3E8D43]/40 transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <span className="flex items-center justify-center gap-2">
              Открыть на сайте
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </a>
        </AnimatedSection>

        {/* Футер с логотипом */}
        <AnimatedSection delay={700} className="mt-10 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src={logo} alt="Gryadka" className="w-10 h-7 object-contain" />
              <span className="text-xl font-bold text-[#3E8D43]">Gryadka</span>
            </div>
            <p className="text-sm text-gray-400">От наших грядок к вашему здоровью</p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}

