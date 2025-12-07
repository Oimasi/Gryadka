import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap, Marker } from "react-leaflet";
import L from "leaflet";
import { getFarms } from "../../api";
import "leaflet/dist/leaflet.css";

// Фикс для дефолтной иконки Leaflet (убирает "флаг")
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MOSCOW_CENTER = { lat: 55.751244, lng: 37.618423 };
const RADIUS_KM = 50;

const MAP_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Кастомные иконки для маркеров
const createCustomIcon = (color, isUser = false) => {
  const size = isUser ? 18 : 14;
  const borderColor = isUser ? "#1e40af" : (color === "#22c55e" ? "#15803d" : "#b91c1c");
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.8);
        ${isUser ? 'animation: pulse 2s infinite;' : ''}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4]
  });
};

const userIcon = createCustomIcon("#3b82f6", true);
const farmInsideIcon = createCustomIcon("#22c55e");
const farmOutsideIcon = createCustomIcon("#ef4444");

function haversineDistanceKm(pointA, pointB) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RecenterOnChange({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function MapController({ isInteractive }) {
  const map = useMap();
  useEffect(() => {
    if (isInteractive) {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    }
  }, [isInteractive, map]);
  return null;
}

export default function FarmsMap() {
  const [center, setCenter] = useState(MOSCOW_CENTER);
  const [locationLabel, setLocationLabel] = useState("Москва");
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInteractive, setMapInteractive] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setLocationLabel("Ваша геолокация");
      },
      () => {
        setError("Не удалось получить геолокацию, показываем центр Москвы");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    async function loadFarms() {
      setLoading(true);
      try {
        const res = await getFarms();
        if (res.ok && Array.isArray(res.data)) {
          setFarms(res.data);
        } else {
          setError("Не удалось загрузить список ферм");
        }
      } catch (e) {
        setError("Ошибка сети при загрузке ферм");
      } finally {
        setLoading(false);
      }
    }
    loadFarms();
  }, []);

  const farmsWithDistance = useMemo(() => {
    return farms
      .filter((f) => Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
      .map((f) => {
        const dist = haversineDistanceKm(center, { lat: f.latitude, lng: f.longitude });
        return { ...f, distanceKm: dist, isInside: dist <= RADIUS_KM };
      });
  }, [farms, center]);

  return (
    <div className="w-full rounded-[20px] overflow-hidden shadow-lg bg-white">
      {/* Заголовок */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-gray-900">
              Карта ферм
            </h3>
            <p className="text-xs sm:text-sm truncate text-gray-500">
              {locationLabel} • Радиус {RADIUS_KM} км
            </p>
          </div>
        </div>
        
        {/* Легенда */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-50 text-emerald-700">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="hidden sm:inline">В радиусе</span>
            <span className="sm:hidden">Доставка</span>
          </span>
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-red-50 text-red-600">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            Вне радиуса
          </span>
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 text-blue-600">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse" />
            Вы здесь
          </span>
        </div>
      </div>

      {/* Карта */}
      <div
        className="relative z-0 h-[260px] sm:h-[340px] md:h-[420px]"
        onMouseLeave={() => setMapInteractive(false)}
      >
        <style>{`
          .custom-marker {
            background: transparent !important;
            border: none !important;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.8; }
          }
          .leaflet-container {
            z-index: 1 !important;
          }
          .leaflet-pane {
            z-index: 1 !important;
          }
          .leaflet-top, .leaflet-bottom {
            z-index: 10 !important;
          }
          .leaflet-popup-pane {
            z-index: 20 !important;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
          }
          .leaflet-popup-content {
            margin: 12px 16px !important;
          }
          .leaflet-popup-tip {
            box-shadow: none !important;
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            border-radius: 12px !important;
            overflow: hidden;
          }
          .leaflet-control-zoom a {
            background: #ffffff !important;
            color: #374151 !important;
            border: none !important;
          }
          .leaflet-control-zoom a:hover {
            background: #f3f4f6 !important;
            color: #111827 !important;
          }
          .leaflet-control-attribution svg,
          .leaflet-control-attribution img,
          .leaflet-attribution-flag {
            display: none !important;
          }
          .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.8) !important;
            color: #6b7280 !important;
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
          .leaflet-control-attribution a {
            color: #6b7280 !important;
          }
          .description-scroll {
            max-height: 140px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #a3a3a3 transparent;
            -webkit-mask-image: linear-gradient(180deg, #000 85%, transparent 100%);
          }
          .description-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .description-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .description-scroll::-webkit-scrollbar-thumb {
            background-color: #a3a3a3;
            border-radius: 9999px;
          }
          .description-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #6b7280;
          }
          @media (max-width: 640px) {
            .leaflet-control-zoom {
              transform: scale(0.85);
              transform-origin: top right;
            }
            .leaflet-popup-content-wrapper {
              max-width: 250px !important;
            }
            .leaflet-popup-content {
              margin: 10px 12px !important;
              font-size: 14px !important;
            }
          }
        `}</style>
        
        {!mapInteractive && (
          <button
            className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-white/70 via-white/40 to-white/0 text-gray-700 text-sm sm:text-base font-medium"
            onClick={() => setMapInteractive(true)}
          >
            Нажмите, чтобы управлять картой
          </button>
        )}

        <MapContainer 
          center={center} 
          zoom={10} 
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution={MAP_ATTRIBUTION}
            url={MAP_URL}
          />
          <RecenterOnChange center={center} />
          <MapController isInteractive={mapInteractive} />
          
          {/* Круг радиуса доставки */}
          <Circle
            center={center}
            radius={RADIUS_KM * 1000}
            pathOptions={{ 
              color: "#10b981", 
              fillColor: "#10b981", 
              fillOpacity: 0.06,
              weight: 2,
              dashArray: "8, 8"
            }}
          />
          
          {/* Маркер пользователя */}
          <Marker center={center} position={center} icon={userIcon}>
            <Popup>
              <div className="text-center py-1">
                <div className="font-semibold text-gray-900">Ваше местоположение</div>
                <div className="text-xs text-gray-500 mt-1">{locationLabel}</div>
              </div>
            </Popup>
          </Marker>
          
          {/* Маркеры ферм */}
          {farmsWithDistance.map((farm) => (
            <Marker
              key={farm.id}
              position={{ lat: farm.latitude, lng: farm.longitude }}
              icon={farm.isInside ? farmInsideIcon : farmOutsideIcon}
            >
              <Popup>
                <div className="min-w-[140px] sm:min-w-[180px]">
                  <div className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2">{farm.name}</div>
                  {farm.description && (
                    <div className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                      <div className="description-scroll rounded-lg bg-gray-50/80 px-3 py-2 border border-gray-100">
                        {farm.description}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${farm.isInside ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      {farm.distanceKm.toFixed(1)} км от вас
                    </span>
                  </div>
                  {farm.isInside && (
                    <div className="mt-1.5 sm:mt-2 text-xs text-emerald-600 font-medium">
                      ✓ Доставка доступна
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Индикатор загрузки */}
        {loading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white shadow-xl flex items-center gap-2 sm:gap-3 mx-4">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm sm:text-base text-gray-700">Загрузка ферм...</span>
            </div>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs sm:text-sm text-gray-500">
            {!loading && farmsWithDistance.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                <span>Найдено</span>
                <span className="font-semibold text-gray-900">{farmsWithDistance.length}</span>
                <span>ферм,</span>
                <span className="font-semibold text-emerald-500">{farmsWithDistance.filter(f => f.isInside).length}</span>
                <span>в зоне доставки</span>
              </span>
            )}
            {!loading && farmsWithDistance.length === 0 && "Фермы пока не найдены"}
          </div>
          {error && (
            <div className="text-xs sm:text-sm text-amber-500 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="line-clamp-2">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
