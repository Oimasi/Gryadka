import React, { useEffect, useState, useMemo } from "react";
import { getProduct, fetchImageAsObjectURL, getPassport, readAccessToken } from "../../api";
import discount from "/images/discount.svg";
import { Footer } from "./Footer";
import { addItem } from "../../hooks/useCart";
import arrow from "/images/arrow.svg";
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
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString("ru-RU", {
    timeZone: 'Europe/Moscow'
  });
}
function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("ru-RU", {
    timeZone: 'Europe/Moscow'
  });
}
function formatLocalTime(s, withSeconds = false) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleTimeString("ru-RU", {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds && { second: '2-digit' })
  });
}
function formatTimeLabel(date, timeRange) {
  if (!date) return "";
  switch(timeRange) {
    case "1h":
      return date.toLocaleTimeString("ru-RU", {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit'
      });
    case "24h":
      return date.toLocaleTimeString("ru-RU", {
        timeZone: 'Europe/Moscow',
        hour: '2-digit'
      }) + ":00";
    case "7d":
    case "all":
      return date.toLocaleDateString("ru-RU", {
        timeZone: 'Europe/Moscow',
        day: 'numeric',
        month: 'short'
      });
    default:
      return formatLocalTime(date);
  }
}
function coordsToLink(s) {
  if (!s) return null;
  const m = String(s).trim();
  if (!m.includes(",")) return null;
  const [lat, lon] = m.split(",").map(x => x.trim());
  if (!lat || !lon) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}`;
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function SensorDataPanel({ product, passport }) {
  const sensorDevices = product?.sensor_devices || [];
  const hasSensors = sensorDevices.length > 0;
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [metric, setMetric] = useState("temperature"); // temperature | ph | salinity | humidity
  const [timeRange, setTimeRange] = useState("24h"); // 1h, 24h, 7d, all
  const [rawReadings, setRawReadings] = useState([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [readingsError, setReadingsError] = useState(null);
  const [sensorInfo, setSensorInfo] = useState(null);
  useEffect(() => {
    if (sensorDevices.length > 0 && !selectedSensorId) {
      setSelectedSensorId(sensorDevices[0].id);
    }
  }, [sensorDevices, selectedSensorId]);
  useEffect(() => {
    if (sensorInfo?.last_seen) {
      console.log("Raw last_seen value:", sensorInfo.last_seen);
      console.log("Parsed as Date:", new Date(sensorInfo.last_seen));
      console.log("Formatted with formatLocalTime:", formatLocalTime(sensorInfo.last_seen, true));
    }
  }, [sensorInfo]);
  useEffect(() => {
    if (!selectedSensorId) return;
    let cancelled = false;
    setLoadingReadings(true);
    setReadingsError(null);
    let hours = null;
    switch(timeRange) {
      case "1h": hours = 1; break;
      case "24h": hours = 24; break;
      case "7d": hours = 168; break;
      default: hours = null;
    }
    const queryString = hours ? `?hours=${hours}` : "";
    const url = `/api/sensors/devices/${selectedSensorId}/readings${queryString}`;
    const token = readAccessToken();
    fetch(url, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          console.log(`Получено ${data.length} записей с датчика`);
          // Сортируем данные тут, бэк их прям так возвращает
          const sortedData = [...data].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          setRawReadings(sortedData);
        } else {
          setReadingsError("Неверный формат данных");
        }
      })
      .catch(err => {
        console.error("Ошибка загрузки данных с датчика:", err);
        if (!cancelled) setReadingsError(err.message || "Ошибка загрузки данных с датчика");
      })
      .finally(() => {
        if (!cancelled) setLoadingReadings(false);
      });
    fetch(`/api/sensors/devices/${selectedSensorId}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) setSensorInfo(data);
      })
      .catch(err => {
        console.error("Ошибка загрузки информации о датчике:", err);
      });
    return () => { cancelled = true; };
  }, [selectedSensorId, timeRange]);
  const getProcessedData = useMemo(() => {
    if (rawReadings.length === 0) return {
      points: [],
      timestamps: [],
      minX: null,
      maxX: null
    };
    // Для 1h диапазона показываем все данные без агрегации
    if (timeRange === "1h") {
      const values = [];
      const timestamps = [];
      rawReadings.forEach(r => {
        if (!r) return;
        let value;
        if (metric in r && r[metric] !== null && r[metric] !== undefined) {
          value = parseFloat(r[metric]);
        }
        else if (r.raw_data && metric in r.raw_data && r.raw_data[metric] !== null && r.raw_data[metric] !== undefined) {
          value = parseFloat(r.raw_data[metric]);
        }
        else if (metric === "temperature" && r.temp !== null && r.temp !== undefined) {
          value = parseFloat(r.temp);
        }
        else if (metric === "humidity" && r.humidity !== null && r.humidity !== undefined) {
          value = parseFloat(r.humidity);
        }
        else if (metric === "ph" && r.ph_value !== null && r.ph_value !== undefined) {
          value = parseFloat(r.ph_value);
        }
        else if (metric === "salinity" && r.salinity !== null && r.salinity !== undefined) {
          value = parseFloat(r.salinity);
        }
        if (value !== undefined && !isNaN(value)) {
          values.push(value);
          timestamps.push(new Date(r.created_at || r.timestamp || r.time));
        }
      });
      return {
        points: values,
        timestamps: timestamps,
        minX: timestamps.length > 0 ? timestamps[0].getTime() : null,
        maxX: timestamps.length > 0 ? timestamps[timestamps.length - 1].getTime() : null
      };
    }
    let intervalMs;
    switch(timeRange) {
      case "24h":
        intervalMs = 10 * 60 * 1000; 
        break;
      case "7d":
        intervalMs = 6 * 60 * 60 * 1000; 
        break;
      case "all":
        intervalMs = 24 * 60 * 60 * 1000; 
        break;
      default:
        intervalMs = 10 * 60 * 1000; 
    }
    const allTimestamps = rawReadings
      .map(r => new Date(r.created_at || r.timestamp || r.time))
      .filter(d => !isNaN(d.getTime()));
    if (allTimestamps.length === 0) {
      return {
        points: [],
        timestamps: [],
        minX: null,
        maxX: null
      };
    }
    const minX = Math.min(...allTimestamps.map(d => d.getTime()));
    const maxX = Math.max(...allTimestamps.map(d => d.getTime()));
    const slots = [];
    let currentTime = minX;
    while (currentTime <= maxX) {
      slots.push({
        start: currentTime,
        end: currentTime + intervalMs,
        values: [],
        timestamp: new Date(currentTime + intervalMs / 2) 
      });
      currentTime += intervalMs;
    }

    rawReadings.forEach(r => {
      if (!r) return;
      let value;
      if (metric in r && r[metric] !== null && r[metric] !== undefined) {
        value = parseFloat(r[metric]);
      }
      else if (r.raw_data && metric in r.raw_data && r.raw_data[metric] !== null && r.raw_data[metric] !== undefined) {
        value = parseFloat(r.raw_data[metric]);
      }
      else if (metric === "temperature" && r.temp !== null && r.temp !== undefined) {
        value = parseFloat(r.temp);
      }
      else if (metric === "humidity" && r.humidity !== null && r.humidity !== undefined) {
        value = parseFloat(r.humidity);
      }
      else if (metric === "ph" && r.ph_value !== null && r.ph_value !== undefined) {
        value = parseFloat(r.ph_value);
      }
      else if (metric === "salinity" && r.salinity !== null && r.salinity !== undefined) {
        value = parseFloat(r.salinity);
      }
      if (value === undefined || isNaN(value)) return;
      const timestamp = new Date(r.created_at || r.timestamp || r.time);
      if (isNaN(timestamp.getTime())) return;
      const timeMs = timestamp.getTime();
      const slotIndex = slots.findIndex(slot => 
        timeMs >= slot.start && timeMs < slot.end
      );
      if (slotIndex !== -1) {
        slots[slotIndex].values.push(value);
      }
    });
    const points = [];
    const timestamps = [];
    slots.forEach(slot => {
      if (slot.values.length > 0) {
        const avgValue = slot.values.reduce((sum, v) => sum + v, 0) / slot.values.length;
        points.push(avgValue);
        timestamps.push(slot.timestamp);
      }
    });
    console.log(`После агрегации: ${points.length} точек для диапазона ${timeRange}`);
    return {
      points,
      timestamps,
      minX,
      maxX
    };
  }, [rawReadings, metric, timeRange]);
  const chartData = useMemo(() => {
    if (getProcessedData.points.length === 0) {
      return { 
        points: [], 
        timestamps: [],
        minValue: 0,
        maxValue: 0,
        avgValue: null,
        lastValue: null,
        minX: null,
        maxX: null
      };
    }
    const { points, timestamps, minX, maxX } = getProcessedData;
    const minValue = Math.min(...points);
    const maxValue = Math.max(...points);
    const avgValue = (points.reduce((sum, v) => sum + v, 0) / points.length).toFixed(2);
    const lastValue = points[points.length - 1].toFixed(2);
    return { 
      points, 
      timestamps,
      minValue,
      maxValue,
      avgValue,
      lastValue,
      minX,
      maxX
    };
  }, [getProcessedData]);
  const xAxisLabels = useMemo(() => {
    if (chartData.timestamps.length === 0 || !chartData.minX || !chartData.maxX) return [];
    const labelCount = 5; 
    const labels = [];
    const timeRange = chartData.maxX - chartData.minX;
    for (let i = 0; i < labelCount; i++) {
      const time = chartData.minX + (timeRange * i) / (labelCount - 1);
      labels.push(new Date(time));
    }
    return labels;
  }, [chartData.timestamps, chartData.minX, chartData.maxX, timeRange]);

  function buildPath() {
    if (chartData.points.length === 0 || !chartData.minX || !chartData.maxX) return "";
    const width = 620; 
    const height = 120; 
    const padding = 10;
    const pathPoints = chartData.points.map((value, index) => {
      const timestamp = chartData.timestamps[index].getTime();
      const x = padding + ((timestamp - chartData.minX) / (chartData.maxX - chartData.minX)) * (width - 2 * padding);
      const rangeY = chartData.maxValue - chartData.minValue;
      const y = height - padding - ((value - chartData.minValue) / (rangeY || 1)) * (height - 2 * padding);
      return { x, y };
    });
    const validPoints = pathPoints.filter(point => 
      !isNaN(point.x) && !isNaN(point.y) && 
      point.x >= 0 && point.x <= width && 
      point.y >= 0 && point.y <= height
    );
    if (validPoints.length === 0) return "";
    return validPoints.map((point, i) => 
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(" ");
  }
  if (!hasSensors) {
    return (
      <div className="mt-6">
        <div className="mt-6 flex items-center gap-3">
          <div className="text-[18px] font-medium text-black">Данные с датчиков</div>
        </div>
        <div className="mt-4 bg-[#F7F7F7] rounded-[20px] p-6 text-center py-8">
          <p className="text-gray-500">К этому товару не подключены датчики</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6">
      <div className="mt-6 flex items-center gap-3">
        <div className="text-[18px] font-medium text-black">Данные с датчиков (мониторинг в реальном времени)</div>
      </div>
      <div className="mt-4 bg-[#F7F7F7] rounded-[20px] p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-500 mr-2">Датчик:</div>
            <select
              value={selectedSensorId || ""}
              onChange={(e) => setSelectedSensorId(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#3E8D43]"
            >
              {sensorDevices.map(sensor => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.name || `Датчик ${sensor.id}`}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500 ml-4 mr-2">Период:</div>
            <div className="flex gap-1">
              {["1h", "24h", "7d", "all"].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    timeRange === range 
                      ? 'bg-[#3E8D43] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {range === "1h" ? "1 час" : 
                   range === "24h" ? "24 часа" : 
                   range === "7d" ? "7 дней" : "Все"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 mr-2">Показатель:</div>
            <div className="flex gap-1">
              {[
                { key: "temperature", label: "Температура", unit: "°C" },
                { key: "humidity", label: "Влажность", unit: "%" },
                { key: "ph", label: "pH", unit: "" },
                { key: "salinity", label: "Соленость", unit: "мСм/см" }
              ].map(m => (
                <button 
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    metric === m.key 
                      ? 'bg-[#3E8D43] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-[12px] p-4">
            <div className="text-sm text-gray-500">Текущее значение</div>
            <div className="text-2xl font-semibold mt-2">
              {loadingReadings ? "Загрузка..." : 
               readingsError ? "Ошибка" : 
               chartData.lastValue !== null ? `${chartData.lastValue} ${metric === "temperature" ? "°C" : metric === "humidity" ? "%" : metric === "ph" ? "" : "мСм/см"}` : "Нет данных"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Среднее: <strong>{loadingReadings ? "—" : chartData.avgValue !== null ? chartData.avgValue : "—"}</strong>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Датчик: {sensorInfo?.name || selectedSensorId}
            </div>
          </div>
          <div className="col-span-2 bg-white rounded-[12px] p-4">
            <div className="text-sm text-gray-500 mb-2 flex justify-between">
              <span>График ({metric === "temperature" ? "Температура" : metric === "humidity" ? "Влажность" : metric === "ph" ? "pH" : "Соленость"})</span>
              <span className="text-xs">{loadingReadings ? "Обновление..." : `${rawReadings.length} измерений`}</span>
            </div>
            <div className="mt-3 h-48 flex items-center justify-center">
              {loadingReadings ? (
                <div className="text-gray-500">Загрузка данных...</div>
              ) : readingsError ? (
                <div className="text-red-500 text-center">Ошибка: {readingsError}</div>
              ) : chartData.points.length === 0 ? (
                <div className="text-gray-500 text-center">Нет данных для отображения</div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 700 180" className="border border-gray-200 rounded">
                  <g stroke="#e2e2e2" strokeWidth="1">
                    {[0, 25, 50, 75, 100].map(p => (
                      <line 
                        key={`grid-${p}`} 
                        x1="40" 
                        y1={`${140 - (p * 1.4)}`} 
                        x2="660" 
                        y2={`${140 - (p * 1.4)}`} 
                      />
                    ))}
                  </g>
                  <g fontSize="10" textAnchor="middle" fill="#666">
                    {xAxisLabels.map((timestamp, i) => {
                      const x = 40 + ((timestamp.getTime() - chartData.minX) / 
                                   (chartData.maxX - chartData.minX || 1)) * 620;
                      return (
                        <text 
                          key={`time-${i}`} 
                          x={x}
                          y="160"
                        >
                          {formatTimeLabel(timestamp, timeRange)}
                        </text>
                      );
                    })}
                  </g>
                  <g fontSize="10" textAnchor="end" fill="#666">
                    <text x="35" y="140">{chartData.minValue.toFixed(1)}</text>
                    <text x="35" y="70">{((chartData.maxValue + chartData.minValue) / 2).toFixed(1)}</text>
                    <text x="35" y="20">{chartData.maxValue.toFixed(1)}</text>
                  </g>
                  <path 
                    d={buildPath()} 
                    fill="none" 
                    stroke="#3E8D43" 
                    strokeWidth="3" 
                    transform="translate(40, 20)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[12px] p-4">
            <div className="text-sm text-gray-500 mb-2">Состояние датчика</div>
            <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${sensorInfo?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {sensorInfo?.is_active ? "Активен" : "Неактивен"} • 
              Последнее обновление: {rawReadings.length > 0 
                ? formatLocalTime(rawReadings[rawReadings.length - 1].created_at, true)
                : (sensorInfo?.last_seen ? formatLocalTime(sensorInfo.last_seen, true) : "неизвестно")}
            </span>
          </div>
          </div>
          <div className="bg-white rounded-[12px] p-4">
            <div className="text-sm text-gray-500 mb-2">Диапазон значений</div>
            <div className="text-sm">
              Мин: <strong>{chartData.minValue.toFixed(1)}</strong> • 
              Макс: <strong>{chartData.maxValue.toFixed(1)}</strong> • 
              Размах: <strong>{(chartData.maxValue - chartData.minValue).toFixed(1)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function ProductDetails({ productId, onClose, setMsg, onNavigate }) {
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
              console.error("Ошибка загрузки изображения:", e);
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
        console.error("Ошибка загрузки товара:", e);
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
  const certifications = passport?.certifications || product?.certifications || [];
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
  function renderCertificateCard(cert) {
    const key = cert._uid || `${cert.name}-${cert.date || ""}`;
    return (
      <div key={key} className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100 flex gap-4 items-start">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#3E8D43]/20 to-[#A8D5A0]/10">
            {/* сертификат */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2l2.5 5.5L20 8l-4 3 1 6L12 14l-5 3 1-6L4 8l5.5-.5L12 2z" fill="#2F855A"/>
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">Сертификат</div>
              <div className="text-base font-semibold text-black mt-1">{cert.name || "—"}</div>
              <div className="text-sm text-gray-600 mt-1">{cert.issuer ? `Выдан: ${cert.issuer}` : ""}</div>
            </div>
            <div className="text-sm text-gray-500 text-right">
              <div>{cert.date ? formatDate(cert.date) : "—"}</div>
            </div>
          </div>
          {cert.notes ? (
            <div className="text-sm text-gray-700 mt-3 leading-relaxed">{cert.notes}</div>
          ) : null}
        </div>
      </div>
    );
  }
  const isGrowing = !!product?.is_growing;
  const hasActiveSensors = (product?.sensor_devices || []).some(s => s.is_active);
  return (
    <div className="max-w-[1330px] mx-auto px-4 py-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-row">
          <div className="mr-3 cursor-pointer" onClick={() => onNavigate("all")}>
            <img src={arrow} className="mt-1 rotate-180 ml-1.5 mb-6 w-[17px] h-[12px]" />
          </div>
          <h3 className="text-[#A8A8A8]"><span className="text-[#A8A8A8] cursor-pointer" onClick={() => onNavigate("main")}>Главная ·</span> Категории · <span className="text-black">{product.category || "—"}</span></h3>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row w-full gap-8">
        <div className="lg:w-1/2">
          <div className="bg-white rounded-[20px] pt-6 pb-6 flex items-center justify-center overflow-hidden">
            {imgSrc ? (
              <img src={imgSrc} alt={product.name} className="w-full h-auto max-h-[640px] object-contain rounded-[16px]" />
            ) : (
              <div className="w-full h-[520px] flex items-center justify-center text-gray-400">{loadingImg ? "Загрузка фотографии..." : "Нет фото"}</div>
            )}
          </div>
        </div>
        <div className="lg:w-1/2">
          <div>
            <p className="text-[16px] text-[#3E8D43]">{product.farm_name || "Ферма"}</p>
            <p className="text-2xl font-bold mt-1">{product.name}</p>
            <p className="mt-3">{renderStars()}</p>
            <div className="mt-6 flex flex-col bg-[#F7F7F7] rounded-[20px] p-6 gap-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl md:text-3xl font-semibold text-black">{formatPrice(mainPrice)}</p>
                    {oldPrice && <p className="text-sm text-gray-400 line-through mt-1">{formatPrice(oldPrice)}</p>}
                  </div>
                  <p className="text-[16px] text-gray-500 mt-1">{formatPrice(mainPrice)}/кг</p>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  {qty === 0 ? (
                    <button onClick={() => handleAdd()} className="bg-[#3E8D43] text-white px-6 md:px-8 py-3 rounded-[12px] font-semibold hover:bg-[#3E8D43]/70 active:bg-[#3E8D43]/60 transition-all duration-150 w-full md:w-auto" >
                      В корзину
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => changeQty(-1)} className="px-4 py-2 bg-gray-200 rounded-md text-lg font-semibold transition-all duration-150 cursor-pointer hover:bg-gray-300">
                        −
                      </button>
                      <span className="text-lg font-semibold w-8 text-center">{qty}</span>
                      <button onClick={() => changeQty(1)} className="px-4 py-2 bg-gray-200 rounded-md text-lg font-semibold transition-all duration-150 cursor-pointer hover:bg-gray-300">
                        +
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">В наличии много</p>
                </div>
              </div>
              <div className="border-t border-[#CCCCCC] pt-4">
                <p className="text-sm text-[#3E8D43] flex gap-2 items-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Доставка за 30 мин, 80 ₽
                </p>
              </div>
            </div>
            <div className="mt-4 bg-[#3E8D43]/20 rounded-[20px] p-6 text-[16px] text-black">
              <div className="flex items-start gap-3">
                <img src={discount} className="w-6 h-6 mt-1" alt="Скидка" />
                <p>Промокод GRYADKA на доставку в вашем городе — скидка 500 рублей на первый заказ.</p>
              </div>
            </div>
            <div className="mt-4 bg-[#F7F7F7] rounded-[20px] p-6">
              <h4 className="text-[18px] text-black font-medium mb-2">Паспорт товара</h4>
              <div className="space-y-2">
                <p className="text-[15px]"><span className="text-gray-500">Происхождение:</span> <span className="text-black">{passport?.origin || "-"}</span></p>
                <p className="text-[15px]"><span className="text-gray-500">Сорт / вид:</span> <span className="text-black">{passport?.variety || "-"}</span></p>
                <p className="text-[15px]"><span className="text-gray-500">Дата сбора:</span> <span className="text-black">{isGrowing ? formatDate(addDays(new Date(), 7)) : formatDate(passport?.harvest_date)}</span></p>
                <p className="text-[15px]"><span className="text-gray-500">Артикул:</span> <span className="text-black">{product.id}</span></p>
                {coordsLink && (
                  <p className="text-[15px]">
                    <span className="text-gray-500">Местоположение:</span> 
                    <a href={coordsLink} target="_blank" rel="noreferrer" className="text-[#3E8D43] hover:underline ml-1">
                      {data["Местоположение точки ( координаты участка)"] || "Показать на карте"}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-[18px] font-medium text-black mb-2">Краткое описание</h3>
        <div className="text-gray-700 text-[15px] leading-relaxed">{product.short_description || "—"}</div>
      </div>
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[18px] font-medium text-black">Пищевая ценность на 100г</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-gray-300 rounded-[20px] p-3 text-center">
            <div className="text-2xl font-semibold">120.0</div>
            <div className="text-sm text-gray-500 mt-1">Калории</div>
          </div>
          <div className="border border-gray-300 rounded-[20px] p-3 text-center">
            <div className="text-2xl font-semibold">12.0</div>
            <div className="text-sm text-gray-500 mt-1">Белки</div>
          </div>
          <div className="border border-gray-300 rounded-[20px] p-3 text-center">
            <div className="text-2xl font-semibold">8.0</div>
            <div className="text-sm text-gray-500 mt-1">Жиры</div>
          </div>
          <div className="border border-gray-300 rounded-[20px] p-3 text-center">
            <div className="text-2xl font-semibold">0.8</div>
            <div className="text-sm text-gray-500 mt-1">Углеводы</div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[18px] font-medium text-black">Качество и контроль</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">{isGrowing ? "Планируемая дата сбора (план)" : "Дата сбора (паспорт)"}</div>
            <div className="text-black font-medium mt-2">{isGrowing ? formatDate(addDays(new Date(), 7)) : (passport?.harvest_date ? formatDate(passport.harvest_date) : "—")}</div>
          </div>
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">Есть датчики</div>
            <div className="font-medium mt-2">{hasActiveSensors ? <span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span> : <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Нет</span>}</div>
          </div>
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">Прошел сертификацию</div>
            <div className="font-medium mt-2"><span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span></div>
          </div>
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">Контроль температуры</div>
            <div className="font-medium mt-2"><span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span></div>
          </div>
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">Контроль влажности</div>
            <div className="font-medium mt-2"><span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Да</span></div>
          </div>
          <div className="bg-[#F7F7F7] rounded-[20px] p-4">
            <div className="text-sm text-gray-500">Оборудование</div>
            <div className="font-medium mt-2"><span className="inline-block text-black">{data["Чем измерялись данные"] || (hasActiveSensors ? "ESP32 + датчики" : "—")}</span></div>
          </div>
        </div>
      </div>
      {isGrowing && hasActiveSensors && (
        <SensorDataPanel product={product} passport={passport} />
      )}
      {!isGrowing && data["Есть датчики"] && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-[18px] font-medium text-black">Данные с датчиков</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Средний pH</div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-2xl font-semibold">{data["Средний pH за время выращивания"] ?? "—"}</div>
                <div>{ratingBadge(data["Оценка pH"])}</div>
              </div>
              <div className="text-sm text-gray-600 mt-2">% вне диапазона: <strong>{data["% измерений pH вне допустимого диапазона"] ?? "—"}</strong></div>
            </div>
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Соленость почвы</div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-2xl font-semibold">{data["Последняя соленость почвы"] ?? "—"}</div>
                <div>{ratingBadge(data["Оценка солености почвы"])}</div>
              </div>
              <div className="text-sm text-gray-600 mt-2">Средняя: <strong>{data["Средняя соленость почвы за время выращивания"] ?? "—"}</strong></div>
            </div>
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Температура</div>
              <div className="flex flex-row justify-between gap-2 mt-4">
                <div className="text-2xl font-semibold mt-2">{data["Средняя температура за время выращивания"] ? `${data["Средняя температура за время выращивания"]} °C` : "—"}</div>
                <div className="mt-2 font-medium text-sm">{data["Наличие резких перепадов температуры"] === "Да" ? <span className="inline-block bg-rose-50 text-rose-700 px-3 py-1 rounded-full">Есть резкие перепады</span> : <span className="inline-block bg-[#3E8D43]/10 text-[#3E8D43] px-3 py-1 rounded-full">Перепадов нет</span>}</div>
              </div>
            </div>
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Время сбора урожая (по данным)</div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-2xl font-semibold">{formatDateTime(data["Время сбора урожая"])}</div>
              </div>
              <div className="text-sm text-gray-600 mt-2">Калибровка pH-электродов: <strong>{data["Дата последней калибровки pH-электродов"] ? formatDate(data["Дата последней калибровки pH-электродов"]) : "—"}</strong></div>
            </div>                
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Последние значимые алерты</div>
              <div className="mt-4 font-medium">{data["Последние значимые алерты"] || "—"}</div>
            </div>
            <div className="bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Используется капельный полив</div>
              <div className="mt-4 font-medium">Да</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[18px] font-medium text-black">Краткая рекомендация от ИИ</div>
            </div>
            <div className="mt-2 bg-[#F7F7F7] rounded-[20px] p-4">
              <div className="text-sm text-gray-500">Gryadka AI</div>
              <div className="mt-4 font-medium">{data["Краткая рекомендация от ИИ"] || "—"}</div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8">
        <div className="text-[18px] font-medium mb-4 text-black">Сертификаты</div>
        {certifications && certifications.length > 0 ? (
          <div className="grid gap-3">
            {certifications.map(cert => renderCertificateCard(cert))}
          </div>
        ) : (
          <div className="text-gray-500 text-md">Сертификаты отсутствуют</div>
        )}
      </div>
      <div className="mt-8">
        <div className="text-[18px] font-medium mb-4 text-black">Дополнительные параметры</div>
        <div className="grid gap-2">
          {Object.entries(data).filter(([k]) => !sensorKeys.has(k)).length === 0 ? (
            <div className="text-gray-500 text-md mt-2">Нет дополнительных параметров</div>
          ) : (
            Object.entries(data).filter(([k]) => !sensorKeys.has(k)).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-[#F7F7F7] gap-4 rounded-[20px] px-6 py-4">
                <div className="text-gray-700">{k}</div>
                <div className="font-medium">{String(v)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}