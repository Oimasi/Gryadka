import React, { useEffect, useState, useMemo } from "react";
import { getProduct, fetchImageAsObjectURL, getPassport, readAccessToken, adoptProduct, getProductGrowth, getProductActions, getBalance } from "../../api";
import discount from "/images/discount.svg";
import { Footer } from "./Footer";
import { addItem } from "../../hooks/useCart";
import arrow from "/images/arrow.svg";
import PlantBoostShop from "./PlantBoostShop";
import { getUserStats } from "../../api";

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
      return date.toLocaleDateString("ru-RU", {
        timeZone: 'Europe/Moscow',
        day: 'numeric',
        month: 'short'
      });
    case "all":
      
      const now = new Date();
      const yearDiff = now.getFullYear() - date.getFullYear();
      if (yearDiff > 0) {
        return date.toLocaleDateString("ru-RU", {
          timeZone: 'Europe/Moscow',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
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
  const [timeRange, setTimeRange] = useState("1h"); // 1h, 24h, 7d, all
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
    if (timeRange !== "all") {
      switch(timeRange) {
        case "1h": hours = 1; break;
        case "24h": hours = 24; break;
        case "7d": hours = 168; break;
        default: hours = null;
      }
    }

   
    const queryString = hours !== null ? `?hours=${hours}` : `?all=true`;
    const url = `/api/sensors/devices/${selectedSensorId}/readings${queryString}`;
    const token = readAccessToken();

    const fetchData = async () => {
      try {
        console.log("Запрос данных с датчика:", url);
        const res = await fetch(url, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          if (res.status === 403) {
            try {
              const errorData = await res.json();
              if (errorData.detail === "Not authenticated") {
                throw new Error("AUTH_REQUIRED");
              }
            } catch (e) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
          }
          try {
            const errorData = await res.json();
            throw new Error(`HTTP ${res.status}: ${res.statusText}. ${errorData.detail || JSON.stringify(errorData)}`);
          } catch (e) {
            let errorText = "";
            try {
              errorText = await res.text();
            } catch (e2) {}
            throw new Error(`HTTP ${res.status}: ${res.statusText}${errorText ? `. ${errorText}` : ""}`);
          }
        }

        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data)) {
          console.log(`Получено ${data.length} записей с датчика`);
          
          const sortedData = [...data].sort((a, b) => {
            const ta = new Date(a.created_at || a.timestamp || a.time).getTime();
            const tb = new Date(b.created_at || b.timestamp || b.time).getTime();
            return ta - tb;
          });
          setRawReadings(sortedData);
        } else {
          setRawReadings([]); 
          setReadingsError("Неверный формат данных");
        }
      } catch (err) {
        console.error("Ошибка загрузки данных с датчика:", err);
        if (!cancelled) {
          if (err.message === "AUTH_REQUIRED") {
            setReadingsError("AUTH_REQUIRED");
          } else {
            setReadingsError(err.message || "Ошибка загрузки данных с датчика");
          }
        }
      } finally {
        if (!cancelled) setLoadingReadings(false);
      }
    };

    fetchData();

    
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

  
  if (readingsError === "AUTH_REQUIRED") {
    return (
      <div className="mt-6">
        <div className="mt-6 flex items-center gap-3">
          <div className="text-[18px] font-medium text-black">Данные с датчиков (мониторинг в реальном времени)</div>
        </div>
        <div className="mt-4 bg-[#F7F7F7] rounded-[20px] p-6 text-center py-8">
          <p className="text-gray-700 font-medium">Авторизуйтесь для просмотра информации о датчиках</p>
        </div>
      </div>
    );
  }

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
        intervalMs = 10 * 60 * 1000; // 10 минут
        break;
      case "7d":
        intervalMs = 2 * 60 * 60 * 1000; // 2 часа
        break;
      case "all":
        
        const allTimestamps = rawReadings.map(r => new Date(r.created_at || r.timestamp || r.time))
          .filter(d => !isNaN(d.getTime()));

        if (allTimestamps.length === 0) {
          return { points: [], timestamps: [], minX: null, maxX: null };
        }

        const minX = Math.min(...allTimestamps.map(d => d.getTime()));
        const maxX = Math.max(...allTimestamps.map(d => d.getTime()));
        const timeRangeMs = maxX - minX;
        const dayMs = 24 * 60 * 60 * 1000;

        if (timeRangeMs > 365 * dayMs) { // больше года
          intervalMs = 7 * dayMs; // неделя
        } else if (timeRangeMs > 180 * dayMs) { // > 6 месяцев
          intervalMs = 3 * dayMs; // 3 дня
        } else if (timeRangeMs > 30 * dayMs) { // > месяц
          intervalMs = dayMs; // день
        } else if (timeRangeMs > 7 * dayMs) { // > неделя
          intervalMs = 12 * 60 * 60 * 1000; // 12 часов
        } else {
          intervalMs = 6 * 60 * 60 * 1000; // 6 часов
        }
        break;
      default:
        intervalMs = 10 * 60 * 1000; // по умолчанию 10 минут
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
    
    if (!intervalMs || !isFinite(intervalMs) || intervalMs <= 0) {
      intervalMs = 10 * 60 * 1000;
    }
    while (currentTime <= maxX) {
      slots.push({
        start: currentTime,
        end: currentTime + intervalMs,
        values: [],
        timestamp: new Date(currentTime + intervalMs / 2)
      });
      currentTime += intervalMs;
      // Если слишком много слотов (миллион) — останавливаемся для защиты
      if (slots.length > 20000) break;
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
      const slotIndex = Math.floor((timeMs - minX) / intervalMs);

      if (slotIndex >= 0 && slotIndex < slots.length) {
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

    console.log(`После агрегации: ${points.length} точек для диапазона ${timeRange} с интервалом ${intervalMs/(60*60*1000)} часов`);

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

    let adjustedMinValue = minValue;
    let adjustedMaxValue = maxValue;

    const range = maxValue - minValue;
    if (range < 0.1) {
      const buffer = Math.max(0.05, Math.abs(minValue) * 0.1);
      adjustedMinValue = minValue - buffer;
      adjustedMaxValue = maxValue + buffer;
    } else if (range < 1) {
      const buffer = 0.2;
      adjustedMinValue = minValue - buffer;
      adjustedMaxValue = maxValue + buffer;
    }

    const avgValue = points.length > 0 ? (points.reduce((sum, v) => sum + v, 0) / points.length).toFixed(2) : null;
    const lastValue = points.length > 0 ? points[points.length - 1].toFixed(2) : null;

    return { 
      points, 
      timestamps,
      minValue: adjustedMinValue,
      maxValue: adjustedMaxValue,
      avgValue,
      lastValue,
      minX,
      maxX
    };
  }, [getProcessedData]);

  const xAxisLabels = useMemo(() => {
    if (chartData.timestamps.length === 0 || chartData.minX == null || chartData.maxX == null) return [];
    
    const timeRangeMs = chartData.maxX - chartData.minX;
    const dayMs = 24 * 60 * 60 * 1000;

    let labelCount;
    if (timeRangeMs > 365 * dayMs) {
      labelCount = 7;
    } else if (timeRangeMs > 180 * dayMs) {
      labelCount = 6;
    } else if (timeRangeMs > 30 * dayMs) {
      labelCount = 5;
    } else if (timeRangeMs > 7 * dayMs) {
      labelCount = 4;
    } else {
      labelCount = 3;
    }

    const labels = [];
    for (let i = 0; i < labelCount; i++) {
      const time = chartData.minX + (timeRangeMs * i) / (labelCount - 1 || 1);
      labels.push(new Date(time));
    }

    return labels;
  }, [chartData.timestamps, chartData.minX, chartData.maxX, timeRange]);

  function buildPath() {
    if (chartData.points.length === 0 || chartData.minX == null || chartData.maxX == null) return "";

    const width = 620; 
    const height = 120; 
    const padding = 10;
    const timeRangeMs = chartData.maxX - chartData.minX;

    if (timeRangeMs === 0) {
      return chartData.points.map((value, index) => {
        const x = padding + (index / (chartData.points.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((value - chartData.minValue) / (chartData.maxValue - chartData.minValue || 1)) * (height - 2 * padding);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    }

    const pathPoints = chartData.points.map((value, index) => {
      const timestamp = chartData.timestamps[index].getTime();
      const x = padding + ((timestamp - chartData.minX) / timeRangeMs) * (width - 2 * padding);

      const rangeY = Math.max(0.1, chartData.maxValue - chartData.minValue);
      const y = height - padding - ((value - chartData.minValue) / rangeY) * (height - 2 * padding);

      return { x, y };
    });

    const validPoints = pathPoints.filter(point => 
      !isNaN(point.x) && !isNaN(point.y) && 
      isFinite(point.x) && isFinite(point.y) &&
      point.x >= -1000 && point.x <= 10000 && 
      point.y >= -1000 && point.y <= 10000
    );

    if (validPoints.length === 0) return "";

    return validPoints.map((point, i) => 
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(" ");
  }

  function buildPathMobile() {
    if (chartData.points.length === 0 || chartData.minX == null || chartData.maxX == null) return "";

    const width = 308; // ширина графика внутри viewBox (340 - 32)
    const height = 120; // высота графика (130 - 10)
    const padding = 0;
    const timeRangeMs = chartData.maxX - chartData.minX;

    if (timeRangeMs === 0) {
      return chartData.points.map((value, index) => {
        const x = padding + (index / (chartData.points.length - 1 || 1)) * width;
        const y = height - ((value - chartData.minValue) / (chartData.maxValue - chartData.minValue || 1)) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    }

    const pathPoints = chartData.points.map((value, index) => {
      const timestamp = chartData.timestamps[index].getTime();
      const x = padding + ((timestamp - chartData.minX) / timeRangeMs) * width;

      const rangeY = Math.max(0.1, chartData.maxValue - chartData.minValue);
      const y = height - ((value - chartData.minValue) / rangeY) * height;

      return { x, y };
    });

    const validPoints = pathPoints.filter(point => 
      !isNaN(point.x) && !isNaN(point.y) && 
      isFinite(point.x) && isFinite(point.y) &&
      point.x >= -1000 && point.x <= 10000 && 
      point.y >= -1000 && point.y <= 10000
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
        <div className="flex flex-col gap-3 mb-4">
          {/* Верхняя строка: датчик и период */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 whitespace-nowrap">Датчик:</div>
              <select
                value={selectedSensorId || ""}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#3E8D43]"
              >
                {sensorDevices.map(sensor => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.name || `Датчик ${sensor.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 whitespace-nowrap">Период:</div>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {["1h", "24h", "7d", "all"].map(range => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${
                      timeRange === range 
                        ? 'bg-[#3E8D43] text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {range === "1h" ? "1ч" : 
                     range === "24h" ? "24ч" : 
                     range === "7d" ? "7д" : "Все"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Нижняя строка: показатели */}
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 whitespace-nowrap">Показатель:</div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {[
                { key: "temperature", label: "Темп.", labelFull: "Температура", unit: "°C" },
                { key: "humidity", label: "Влаж.", labelFull: "Влажность", unit: "%" },
                { key: "ph", label: "pH", labelFull: "pH", unit: "" },
                { key: "salinity", label: "Сол.", labelFull: "Соленость", unit: "мСм/см" }
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`
                    px-2 sm:px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap font-medium
                    ${
                      metric === m.key
                        ? "bg-[#3E8D43] text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }
                  `}
                >
                  <span className="sm:hidden">{m.label}</span>
                  <span className="hidden sm:inline">{m.labelFull}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {/* Текущее значение - компактная карточка */}
          <div className="bg-white rounded-[12px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm text-gray-500">Текущее значение</div>
                <div className="text-xl sm:text-2xl font-semibold mt-1">
                  {loadingReadings ? "Загрузка..." : 
                   readingsError ? "Ошибка" : 
                   chartData.lastValue !== null ? `${chartData.lastValue} ${metric === "temperature" ? "°C" : metric === "humidity" ? "%" : metric === "ph" ? "" : "мСм/см"}` : "Нет данных"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Среднее: <strong>{loadingReadings ? "—" : chartData.avgValue !== null ? chartData.avgValue : "—"}</strong>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Датчик: {sensorInfo?.name || selectedSensorId}
                </div>
              </div>
            </div>
          </div>
          
          {/* График - полная ширина */}
          <div className="bg-white rounded-[12px] p-3 sm:p-4">
            <div className="text-sm text-gray-500 mb-2 flex justify-between">
              <span>График ({metric === "temperature" ? "Температура" : metric === "humidity" ? "Влажность" : metric === "ph" ? "pH" : "Соленость"})</span>
              <span className="text-xs">{loadingReadings ? "Обновление..." : `${rawReadings.length} измерений`}</span>
            </div>
            <div className="mt-2 h-40 sm:h-48 flex items-center justify-center overflow-hidden">
              {loadingReadings ? (
                <div className="text-gray-500">Загрузка данных...</div>
              ) : readingsError ? (
                <div className="text-red-500 text-center">Ошибка: {readingsError}</div>
              ) : chartData.points.length === 0 ? (
                <div className="text-gray-500 text-center">Нет данных для отображения</div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 350 160" preserveAspectRatio="xMidYMid meet" className="border border-gray-200 rounded">
                  <g stroke="#e2e2e2" strokeWidth="1">
                    {[0, 25, 50, 75, 100].map(p => (
                      <line 
                        key={`grid-${p}`} 
                        x1="32" 
                        y1={`${130 - (p * 1.2)}`} 
                        x2="340" 
                        y2={`${130 - (p * 1.2)}`} 
                      />
                    ))}
                  </g>
                  <g fontSize="9" textAnchor="middle" fill="#666">
                    {xAxisLabels.map((timestamp, i) => {
                      const timeRangeMs = chartData.maxX - chartData.minX;
                      const x = timeRangeMs > 0 ? 
                        32 + ((timestamp.getTime() - chartData.minX) / timeRangeMs) * 308 : 
                        32 + (i / (xAxisLabels.length - 1 || 1)) * 308;
                      
                      return (
                        <text 
                          key={`time-${i}`} 
                          x={x}
                          y="150"
                        >
                          {formatTimeLabel(timestamp, timeRange)}
                        </text>
                      );
                    })}
                  </g>
                  <g fontSize="9" textAnchor="end" fill="#666">
                    <text x="28" y="130">{chartData.minValue.toFixed(1)}</text>
                    <text x="28" y="70">{((chartData.maxValue + chartData.minValue) / 2).toFixed(1)}</text>
                    <text x="28" y="15">{chartData.maxValue.toFixed(1)}</text>
                  </g>
                  <path 
                    d={buildPathMobile()} 
                    fill="none" 
                    stroke="#3E8D43" 
                    strokeWidth="2" 
                    transform="translate(32, 10)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-[12px] p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">Состояние датчика</div>
            <div className="flex items-center flex-wrap gap-1">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${sensorInfo?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs sm:text-sm font-medium">
                {sensorInfo?.is_active ? "Активен" : "Неактивен"}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                • Обновлено: {rawReadings.length > 0 
                  ? formatLocalTime(rawReadings[rawReadings.length - 1].created_at, true)
                  : (sensorInfo?.last_seen ? formatLocalTime(sensorInfo.last_seen, true) : "—")}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-[12px] p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">Диапазон значений</div>
            <div className="text-xs sm:text-sm flex flex-wrap gap-x-2 gap-y-1">
              <span>Мин: <strong>{chartData.minValue.toFixed(1)}</strong></span>
              <span>Макс: <strong>{chartData.maxValue.toFixed(1)}</strong></span>
              <span>Размах: <strong>{(chartData.maxValue - chartData.minValue).toFixed(1)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, isOpen, onToggle, className = "mt-8", children }) {
  return (
    <div className={`${className} rounded-[20px] border border-gray-100 bg-white/70 shadow-sm backdrop-blur-sm`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:bg-[#F7F7F7]"
      >
        <div>
          <div className="text-[18px] font-semibold text-black flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#3E8D43] to-[#9adf9b] shadow-sm" aria-hidden />
            {title}
          </div>
          {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      <div
        className={`
          transition-[max-height,opacity,transform] duration-300 ease-out
          ${isOpen ? "max-h-[3000px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"}
          overflow-hidden
        `}
      >
        <div className="px-5 pb-5 pt-1">
          {children}
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
  const [openSections, setOpenSections] = useState({
    sensors: false,
    certificates: false,
    extra: false
  });
  
  // Gamification states
  const [growthInfo, setGrowthInfo] = useState(null);
  const [productActions, setProductActions] = useState([]);
  const [adopting, setAdopting] = useState(false);
  const [showBoostShop, setShowBoostShop] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

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

  // Load growth info for growing products
  useEffect(() => {
    if (!product?.is_growing) return;
    
    const token = readAccessToken();
    if (!token) return;
    
    Promise.all([
      getProductGrowth(productId),
      getBalance()
    ]).then(([growthRes, balanceRes]) => {
      if (growthRes.ok) {
        setGrowthInfo(growthRes.data);
        setProductActions(growthRes.data.recent_actions || []);
      }
      if (balanceRes.ok) {
        setUserBalance(balanceRes.data?.balance || 0);
      }
    });
  }, [product?.is_growing, productId]);

  // Handle adopt
  async function handleAdopt() {
    if (userBalance < 300) {
      setMsg && setMsg("Недостаточно средств. Пополните баланс в разделе 'Мои растения'");
      return;
    }
    
    setAdopting(true);
    const res = await adoptProduct(productId);
    setAdopting(false);
    
    if (res.ok) {
      setGrowthInfo(prev => prev ? { ...prev, is_adopted: true } : null);
      setUserBalance(prev => prev - 300);
      setMsg && setMsg("Вы стали опекуном! Растение будет доставлено вам после сбора");
    } else {
      if (res.data?.detail?.includes("Insufficient balance")) {
        setMsg && setMsg("Недостаточно средств. Пополните баланс в разделе 'Мои растения'");
      } else {
        setMsg && setMsg(res.data?.detail || "Не удалось стать опекуном");
      }
    }
  }

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
  const isHalal = Boolean(product?.is_halal);
  const isLenten = Boolean(product?.is_lenten);
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

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
            {(isHalal || isLenten) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {isHalal && <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">Халяль</span>}
                {isLenten && <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">Постное</span>}
              </div>
            )}
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

      {/* Прогресс роста + кнопки опекуна */}
      {isGrowing && (
        <div className="mt-6 p-4 bg-[#F7F7F7] rounded-[16px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Прогресс роста</span>
            <span className="text-sm font-medium">{growthInfo?.growth_percent || 0}% · День {growthInfo?.days_growing || 0}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#3E8D43] rounded-full transition-all duration-500"
              style={{ width: `${growthInfo?.growth_percent || 0}%` }}
            />
          </div>
          {growthInfo?.health_score != null && (
            <div className="mt-3 flex flex-col gap-1 text-sm text-gray-700">
              <span className="px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200 w-fit">
                Здоровье: {growthInfo.health_score}% {growthInfo.health_status ? `· ${growthInfo.health_status}` : ""}
              </span>
              {growthInfo.health_history && growthInfo.health_history.length > 0 && (
                <div className="flex items-end gap-1 h-12">
                  {growthInfo.health_history.map((p, idx) => (
                    <div key={idx} title={`${p.date}: ${p.score}%`} className="w-2 flex-1 bg-gray-100 rounded-sm overflow-hidden">
                      <div className={`${p.score >= 80 ? "bg-green-500" : p.score >= 60 ? "bg-emerald-500" : p.score >= 40 ? "bg-amber-400" : "bg-rose-400"}`} style={{ height: `${Math.max(10, Math.min(100, p.score))}%` }}></div>
                    </div>
                  ))}
                </div>
              )}
              {growthInfo.health_tip && <span className="text-xs text-gray-500">{growthInfo.health_tip}</span>}
            </div>
          )}
          
          {/* Статус опекуна или кнопка */}
          <div className="mt-4">
            {growthInfo?.is_adopted ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#3E8D43] rounded-full"></div>
                  <span className="text-sm text-[#3E8D43] font-medium">Вы опекун этого растения</span>
                </div>
                <button
                  onClick={() => setShowBoostShop(true)}
                  className="py-2 px-4 bg-[#3E8D43] text-white rounded-[10px] font-medium hover:bg-[#357a3a] transition-colors text-sm"
                >
                  Бусты
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAdopt}
                  disabled={adopting || !readAccessToken() || userBalance < 300}
                  className="flex-1 py-2.5 px-4 bg-[#3E8D43] text-white rounded-[10px] font-medium hover:bg-[#357a3a] transition-colors disabled:opacity-50 text-sm"
                >
                  {adopting ? "..." : (readAccessToken() ? "Стать опекуном · 300 ₽" : "Войдите")}
                </button>
                
                {/* Подсказка */}
                <div className="relative group">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
                    ?
                  </button>
                  <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="font-medium mb-1">Что даёт опекунство:</div>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Растение будет доставлено вам после сбора</li>
                      <li>• Вы видите процесс выращивания в реальном времени</li>
                      <li>• Можете помогать растению бустами</li>
                    </ul>
                    <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
        <CollapsibleSection
          title="Датчики"
          subtitle="Мониторинг в реальном времени"
          isOpen={openSections.sensors}
          onToggle={() => toggleSection("sensors")}
        >
          {openSections.sensors && <SensorDataPanel product={product} passport={passport} />}
        </CollapsibleSection>
      )}

      {!isGrowing && data["Есть датчики"] && (
        <CollapsibleSection
          title="Датчики"
          subtitle="Сводные данные выращивания"
          isOpen={openSections.sensors}
          onToggle={() => toggleSection("sensors")}
        >
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
        </CollapsibleSection>
      )}

      {data["Краткая рекомендация от ИИ"] && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="text-[18px] font-medium text-black">Рекомендация от ИИ</div>
          </div>
          <div className="bg-gradient-to-br from-[#3E8D43]/5 to-[#3E8D43]/10 rounded-[20px] p-6 border border-[#3E8D43]/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-[#3E8D43] rounded-full animate-pulse"></div>
              <div className="text-sm text-[#3E8D43] font-medium">Gryadka AI</div>
            </div>
            <div className="text-[15px] text-gray-700 leading-relaxed">{data["Краткая рекомендация от ИИ"]}</div>
          </div>
        </div>
      )}

      <CollapsibleSection
        title={<>Сертификаты <span className="text-xs font-normal text-gray-400">(данные из системы ВетИС)</span></>}
        subtitle="Документы подтверждающие качество"
        isOpen={openSections.certificates}
        onToggle={() => toggleSection("certificates")}
      >
        {certifications && certifications.length > 0 ? (
          <div className="grid gap-3">
            {certifications.map(cert => renderCertificateCard(cert))}
          </div>
        ) : (
          <div className="text-gray-500 text-md">Сертификаты отсутствуют</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Дополнительные параметры"
        subtitle="Пользовательские поля паспорта"
        isOpen={openSections.extra}
        onToggle={() => toggleSection("extra")}
      >
        <div className="grid gap-2">
          {Object.entries(data).filter(([k]) => !sensorKeys.has(k)).length === 0 ? (
            <div className="text-gray-500 text-md mt-2">Нет дополнительных параметров</div>
          ) : (
            Object.entries(data).filter(([k]) => !sensorKeys.has(k)).map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#F7F7F7] gap-1 sm:gap-4 rounded-[20px] px-4 sm:px-6 py-3 sm:py-4">
                <div className="text-gray-500 text-sm sm:text-base">{k}</div>
                <div className="font-medium text-black break-words">{String(v)}</div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <div className="mt-16">
        <Footer />
      </div>
      
      {/* Boost Shop Modal */}
      {showBoostShop && (
        <PlantBoostShop
          plant={{
            product_id: product.id,
            product_name: product.name,
            nickname: growthInfo?.adoption_nickname
          }}
          balance={userBalance}
          onClose={() => setShowBoostShop(false)}
          onActionComplete={async (newBalance, spentDelta = 0) => {
            setUserBalance(newBalance);
            // Перезагружаем действия
            getProductGrowth(productId).then(res => {
              if (res.ok) {
                setProductActions(res.data.recent_actions || []);
              }
            });
            // Пробуем обновить статистику, чтобы «Потрачено» и «Бусты» не были 0
            try {
              const statsRes = await getUserStats();
              if (statsRes.ok && statsRes.data?.stats) {
                // сохраняем в localStorage, чтобы MyPlants мог воспользоваться при следующем рендере
                const s = statsRes.data.stats;
                const boosted = {
                  ...s,
                  boosts: spentDelta > 0 ? (s.boosts || 0) + 1 : s.boosts,
                  total_spent: spentDelta > 0 ? (s.total_spent || 0) + spentDelta : s.total_spent
                };
                localStorage.setItem('gryadka_cached_stats', JSON.stringify(boosted));
                localStorage.setItem('gryadka_cached_level', JSON.stringify(statsRes.data.level));
              }
            } catch (e) {
              console.error("Failed to refresh stats after boost", e);
            }
          }}
        />
      )}
    </div>
  );
}
