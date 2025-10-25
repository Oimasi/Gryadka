import React, { useEffect, useState } from "react";
import {
  createProduct,
  updateProduct,
  uploadProductMediaDirect,
  confirmMediaUpload,
  upsertPassport,
  getFarms,
  getProduct
} from "../../api";
import { Footer } from "./Footer";


function CertificateItem({ cert, onChange, onRemove }) {
  const idBase = cert._uid ? `cert-${cert._uid}` : `cert-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="p-3 mb-3 border rounded bg-white" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p className="font-medium text-black text-[16px] mb-2">Новый сертификат</p>
        <button type="button" className="text-sm text-red-600" onClick={onRemove}>Удалить</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="label" htmlFor={`${idBase}-name`}>Название</label>
        <input id={`${idBase}-name`} name={`cert_name_${cert._uid || ""}`} className="w-full input" value={cert.name || ""} onChange={(e) => onChange({ ...cert, name: e.target.value })} placeholder="" required />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="label" htmlFor={`${idBase}-issuer`}>Выдан</label>
        <input id={`${idBase}-issuer`} name={`cert_issuer_${cert._uid || ""}`} className="w-full input" value={cert.issuer || ""} onChange={(e) => onChange({ ...cert, issuer: e.target.value })} placeholder="" required />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="label" htmlFor={`${idBase}-date`}>Дата</label>
        <input id={`${idBase}-date`} name={`cert_date_${cert._uid || ""}`} type="date" className="w-full input" value={cert.date || ""} onChange={(e) => onChange({ ...cert, date: e.target.value })} />
      </div>

      <div>
        <label className="label" htmlFor={`${idBase}-notes`}>Примечания</label>
        <input id={`${idBase}-notes`} name={`cert_notes_${cert._uid || ""}`} className="w-full input" value={cert.notes || ""} onChange={(e) => onChange({ ...cert, notes: e.target.value })} placeholder="" />
      </div>
    </div>
  );
}
function ProductPassportForm({ passport = null, onChange }) {
  const safePassport = passport || { origin: "", variety: "", harvest_date: "", certifications: [], data: {} };

  const RESERVED_SENSOR_KEYS = [
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
  ];

  const genUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  useEffect(() => {
    if (!passport) return;
    const needAssign = (passport.certifications || []).some(c => !c._uid);
    if (needAssign) {
      const arr = (passport.certifications || []).map(c => c._uid ? c : { ...c, _uid: genUid() });
      onChange && onChange({ ...safePassport, certifications: arr });
    }
    
  }, []); 

  const setField = (changes) => onChange && onChange({ ...safePassport, ...changes });
  const setDataKey = (k, v) => onChange && onChange({ ...safePassport, data: { ...(safePassport.data || {}), [k]: v } });
  const removeDataKey = (k) => {
    if (RESERVED_SENSOR_KEYS.includes(k)) return;
    const d = { ...(safePassport.data || {}) };
    delete d[k];
    onChange && onChange({ ...safePassport, data: d });
  };

  const sensorsEnabled = Boolean((safePassport.data || {})["Есть датчики"]);

  const enableSensorsDefaults = () => {
    const d = { ...(safePassport.data || {}) };
    if (d["Есть датчики"]) return;
    d["Есть датчики"] = true;
    d["Средний pH за время выращивания"] = d["Средний pH за время выращивания"] ?? "";
    d["% измерений pH вне допустимого диапазона"] = d["% измерений pH вне допустимого диапазона"] ?? "";
    d["Оценка pH"] = d["Оценка pH"] ?? "";
    d["Последняя соленость почвы"] = d["Последняя соленость почвы"] ?? "";
    d["Средняя соленость почвы за время выращивания"] = d["Средняя соленость почвы за время выращивания"] ?? "";
    d["Оценка солености почвы"] = d["Оценка солености почвы"] ?? "";
    d["Средняя температура за время выращивания"] = d["Средняя температура за время выращивания"] ?? "";
    d["Наличие резких перепадов температуры"] = d["Наличие резких перепадов температуры"] ?? "";
    d["Время сбора урожая"] = d["Время сбора урожая"] ?? "";
    d["Чем измерялись данные"] = d["Чем измерялись данные"] ?? "garsen v1.0.0";
    d["Дата последней калибровки pH-электродов"] = d["Дата последней калибровки pH-электродов"] ?? "";
    d["Фото площадки от шлюза"] = d["Фото площадки от шлюза"] ?? "Нет фото";
    d["Местоположение точки ( координаты участка)"] = d["Местоположение точки ( координаты участка)"] ?? "";
    d["Последние значимые алерты"] = d["Последние значимые алерты"] ?? "";
    d["Краткая рекомендация от ИИ"] = d["Краткая рекомендация от ИИ"] ?? "";
    onChange && onChange({ ...safePassport, data: d });
  };

  // Отключение датчиков
  const disableSensors = () => {
    const d = { ...(safePassport.data || {}) };
    delete d["Есть датчики"];
    onChange && onChange({ ...safePassport, data: d });
  };

  const addCertificate = () => {
    const newCert = { _uid: genUid(), name: "", issuer: "", date: "", notes: "" };
    const arr = [...(safePassport.certifications || []), newCert];
    onChange && onChange({ ...safePassport, certifications: arr });
  };
  const updateCertificate = (i, cert) => {
    const arr = [...(safePassport.certifications || [])];
    arr[i] = cert;
    onChange && onChange({ ...safePassport, certifications: arr });
  };
  const removeCertificate = (i) => {
    const arr = (safePassport.certifications || []).filter((_, idx) => idx !== i);
    onChange && onChange({ ...safePassport, certifications: arr });
  };

  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");


  const [harvestDisplay, setHarvestDisplay] = useState(() => {
    const v = (safePassport.data || {})["Время сбора урожая"] || "";
    return formatHarvestForDisplay(v);
  });
  const [harvestError, setHarvestError] = useState("");

  useEffect(() => {
    const v = (safePassport.data || {})["Время сбора урожая"] || "";
    setHarvestDisplay(formatHarvestForDisplay(v));
  }, [safePassport.data && safePassport.data["Время сбора урожая"]]);

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function formatIsoToDDMMYYYYHHMM(val) {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return val;
    }
  }
  function looksLikeDDMMYYYYHHMM(s) {
    return /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}$/.test(s);
  }
  function parseDDMMYYYYHHMMToIso(s) {
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!m) return null;
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    const yyyy = parseInt(m[3], 10);
    const hh = parseInt(m[4], 10);
    const min = parseInt(m[5], 10);
    const d = new Date(yyyy, mm, dd, hh, min);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  function formatHarvestForDisplay(val) {
    if (!val) return "";
    if (looksLikeDDMMYYYYHHMM(val)) return val;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return formatIsoToDDMMYYYYHHMM(val);
      }
    } catch (e) {}
    return val;
  }


  function maskDigitsToDisplay(rawDigits) {
   
    const d = rawDigits.slice(0, 12);
    const parts = [];
    if (d.length >= 2) {
      parts.push(d.slice(0,2)); 
    } else if (d.length > 0) {
      parts.push(d);
    }
    if (d.length >= 4) {
      parts.push(d.slice(2,4)); 
    } else if (d.length > 2) {
      parts.push(d.slice(2));
    }
    
    if (d.length >= 8) {
      parts.push(d.slice(4,8));
    } else if (d.length > 4) {
      parts.push(d.slice(4));
    }
  
    if (d.length >= 10) {
      parts.push(d.slice(8,10));
    } else if (d.length > 8) {
      parts.push(d.slice(8));
    }
    
    if (d.length === 12) {
      parts.push(d.slice(10,12));
    } else if (d.length > 10) {
      parts.push(d.slice(10));
    }

   
    let display = "";
    if (parts.length > 0) {
      display += parts[0]; 
    }
    if (d.length >= 3) {
      display += "." + (parts[1] || "");
    } else if (d.length >= 3) {
      display += "." + (parts[1] || "");
    }
    if (d.length >= 5) {
      display += "." + (parts[2] || "");
    } else if (d.length > 4) {
      display += "." + (parts[2] || "");
    }
    if (d.length >= 9) {
      display += " " + (parts[3] || "");
    } else if (d.length > 8) {
      display += " " + (parts[3] || "");
    }
    if (d.length >= 11) {
      display += ":" + (parts[4] || "");
    } else if (d.length > 10) {
      display += ":" + (parts[4] || "");
    }

    return display;
  }

  
  const handleHarvestChange = (e) => {
    const raw = e.target.value || "";
   
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    const display = maskDigitsToDisplay(digits);
    setHarvestDisplay(display);

    if (digits.length === 12) {
      
      const dd = digits.slice(0,2);
      const mm = digits.slice(2,4);
      const yyyy = digits.slice(4,8);
      const hh = digits.slice(8,10);
      const min = digits.slice(10,12);
      const formatted = `${dd}.${mm}.${yyyy} ${hh}:${min}`;
      const iso = parseDDMMYYYYHHMMToIso(formatted);
      if (iso) {
        setDataKey("Время сбора урожая", iso);
        setHarvestError("");
      } else {
        
        setDataKey("Время сбора урожая", "");
        setHarvestError("Неверная дата/время");
      }
    } else {
      
      setDataKey("Время сбора урожая", "");
      setHarvestError("Введите полностью в формате дд.мм.гггг чч:мм");
    }
  };

 
  const handleHarvestBlur = () => {
    if (looksLikeDDMMYYYYHHMM(harvestDisplay)) {
      const iso = parseDDMMYYYYHHMMToIso(harvestDisplay);
      if (iso) {
        setDataKey("Время сбора урожая", iso);
        setHarvestError("");
      } else {
        setDataKey("Время сбора урожая", "");
        setHarvestError("Неверная дата/время");
      }
    } else {
      setDataKey("Время сбора урожая", "");
      if (harvestDisplay) setHarvestError("Введите полностью в формате дд.мм.гггг чч:мм");
      else setHarvestError("");
    }
  };
 

  const addCustomParam = () => {
    const key = (customKey || "").trim();
    if (!key) return;
    if (RESERVED_SENSOR_KEYS.includes(key)) {
      setCustomKey("");
      setCustomValue("");
      return;
    }
    if (safePassport.data && Object.prototype.hasOwnProperty.call(safePassport.data, key)) {
      setCustomKey("");
      setCustomValue("");
      return;
    }
    const d = { ...(safePassport.data || {}), [key]: customValue };
    onChange && onChange({ ...safePassport, data: d });
    setCustomKey("");
    setCustomValue("");
  };

  return (
    <div className="mt-6 max-w-[1330px] w-full rounded-xl">
      <h4 className="font-semibold text-black text-[20px] mb-4">Паспорт товара</h4>

      <div className="mt-5 row">
        <label className="label" htmlFor="passport-origin">Происхождение</label>
        <input id="passport-origin" name="passport_origin" className="w-full input" value={safePassport.origin || ""} onChange={(e) => setField({ origin: e.target.value })} placeholder="" />
      </div>

      <div className="mt-5 row">
        <label className="label" htmlFor="passport-variety">Сорт / вид</label>
        <input id="passport-variety" name="passport_variety" className="w-full input" value={safePassport.variety || ""} onChange={(e) => setField({ variety: e.target.value })} placeholder="" />
      </div>

      <div className="mt-5 row">
        <label className="label" htmlFor="passport-harvest">Дата сбора урожая</label>
        <input id="passport-harvest" name="passport_harvest_date" type="date" className="w-full input" value={safePassport.harvest_date || ""} onChange={(e) => setField({ harvest_date: e.target.value })} />
      </div>

      <div className="mb-5">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h5 className="font-semibold text-black text-[20px] mb-5">Сертификаты</h5>
          <button type="button" className="text-sm text-blue-600" onClick={addCertificate}>+ Добавить</button>
        </div>

        {(!safePassport.certifications || safePassport.certifications.length === 0) && <div className="text-sm text-gray-500 mt-3">Нет сертификатов</div>}
        {(safePassport.certifications || []).map((c, i) => (
          <CertificateItem
            key={c._uid || i}
            cert={c}
            onChange={(updated) => updateCertificate(i, updated)}
            onRemove={() => removeCertificate(i)}
          />
        ))}
      </div>

      <div className="mb-4 pt-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h5 className="font-semibold text-black text-[20px] mb-4">Датчики / сенсоры</h5>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label className="label" htmlFor="has-sensors" style={{ margin: 0 }}>Есть датчики</label>
            <input
              id="has-sensors"
              type="checkbox"
              name="has_sensors"
              checked={sensorsEnabled}
              onChange={(e) => e.target.checked ? enableSensorsDefaults() : disableSensors()}
              aria-label="Есть датчики"
            />
          </div>
        </div>


        {sensorsEnabled && (
          <div className="sensor-area">
            <div className="responsive-grid">
              <div className="row mb-5">
                <label className="label" htmlFor="sensor-avg-ph">Средний pH за время выращивания</label>
                <input id="sensor-avg-ph" name="sensor_avg_ph" className="w-full input" type="number" step="0.01" value={safePassport.data["Средний pH за время выращивания"] || ""} onChange={(e) => setDataKey("Средний pH за время выращивания", e.target.value)} required />
              </div>

              <div className="row mb-5">
                <label className="label" htmlFor="sensor-ph-out"> % измерений pH вне допустимого диапазона</label>
                <input id="sensor-ph-out" name="sensor_ph_out_of_range" className="w-full input" type="number" step="0.1" value={safePassport.data["% измерений pH вне допустимого диапазона"] || ""} onChange={(e) => setDataKey("% измерений pH вне допустимого диапазона", e.target.value)} required />
              </div>
            </div>

            <div className="row mb-5">
              <label className="label" htmlFor="sensor-ph-rating">Оценка pH</label>
              <select id="sensor-ph-rating" name="sensor_ph_rating" className="w-full input" value={safePassport.data["Оценка pH"] || ""} onChange={(e) => setDataKey("Оценка pH", e.target.value)} required>
                <option value="">— выберите —</option>
                <option value="Хорошая">Хорошая</option>
                <option value="Средняя">Средняя</option>
                <option value="Плохая">Плохая</option>
              </select>
            </div>

            <div className="responsive-grid" style={{ marginTop: 23 }}>
              <div className="row mb-5">
                <label className="label" htmlFor="sensor-last-salinity">Последняя соленость почвы</label>
                <input id="sensor-last-salinity" name="sensor_last_salinity" className="w-full input" type="number" step="0.01" value={safePassport.data["Последняя соленость почвы"] || ""} onChange={(e) => setDataKey("Последняя соленость почвы", e.target.value)} />
              </div>
              <div className="row mb-5">
                <label className="label" htmlFor="sensor-avg-salinity">Средняя соленость почвы за время выращивания</label>
                <input id="sensor-avg-salinity" name="sensor_avg_salinity" className="w-full input" type="number" step="0.01" value={safePassport.data["Средняя соленость почвы за время выращивания"] || ""} onChange={(e) => setDataKey("Средняя соленость почвы за время выращивания", e.target.value)} />
              </div>
            </div>

            <div className="row mb-5">
              <label className="label" htmlFor="sensor-salinity-rating">Оценка солености почвы</label>
              <select id="sensor-salinity-rating" name="sensor_salinity_rating" className="w-full input" value={safePassport.data["Оценка солености почвы"] || ""} onChange={(e) => setDataKey("Оценка солености почвы", e.target.value)}>
                <option value="">— выберите —</option>
                <option value="Хорошая">Хорошая</option>
                <option value="Средняя">Средняя</option>
                <option value="Плохая">Плохая</option>
              </select>
            </div>

            <div className="responsive-grid" style={{ marginTop: 8 }}>
              <div className="row mt-5">
                <label className="label" htmlFor="sensor-avg-temp">Средняя температура за время выращивания</label>
                <input id="sensor-avg-temp" name="sensor_avg_temp" className="w-full input" value={safePassport.data["Средняя температура за время выращивания"] || ""} onChange={(e) => setDataKey("Средняя температура за время выращивания", e.target.value)} />
              </div>
              <div className="row mt-5">
                <label className="label" htmlFor="sensor-temp-spikes">Наличие резких перепадов температуры</label>
                <select id="sensor-temp-spikes" name="sensor_temp_spikes" className="w-full input" value={safePassport.data["Наличие резких перепадов температуры"] || ""} onChange={(e) => setDataKey("Наличие резких перепадов температуры", e.target.value)}>
                  <option value="">— выберите —</option>
                  <option value="Да">Да</option>
                  <option value="Нет">Нет</option>
                </select>
              </div>
            </div>

            <div className="row mt-5">
              <label className="label" htmlFor="sensor-harvest-time">Время сбора урожая (по данным)</label>
              <input
                id="sensor-harvest-time"
                name="sensor_harvest_time"
                className="w-full input"
                value={harvestDisplay}
                onChange={handleHarvestChange}
                onBlur={handleHarvestBlur}
                placeholder=""
                aria-describedby="harvest-error"
                aria-label="Время сбора урожая в формате дд.мм.гггг чч:мм"
              />
             
              {harvestError ? <div id="harvest-error" className="text-xs text-red-600 mt-1">{harvestError}</div> : null}
            </div>

            <div className="row mt-5">
              <label className="label" htmlFor="sensor-ph-calibrated">Дата последней калибровки pH-электродов</label>
              <input id="sensor-ph-calibrated" name="sensor_ph_calibrated" type="date" className="w-full input" value={safePassport.data["Дата последней калибровки pH-электродов"] || ""} onChange={(e) => setDataKey("Дата последней калибровки pH-электродов", e.target.value)} />
            </div>

            <div className="row mt-5 mb-5">
              <label className="label" htmlFor="sensor-coords">Местоположение точки (координаты участка)</label>
              <input id="sensor-coords" name="sensor_coords" className="w-full input" value={safePassport.data["Местоположение точки ( координаты участка)"] || ""} onChange={(e) => setDataKey("Местоположение точки ( координаты участка)", e.target.value)} placeholder="lat,lon" />
            </div>

            <div className="row mt-5 mb-5">
              <label className="label" htmlFor="sensor-gateway-photo">Фото площадки от шлюза (ссылка / описание)</label>
              <input id="sensor-gateway-photo" name="sensor_gateway_photo" className="w-full input" value={safePassport.data["Фото площадки от шлюза"] || ""} onChange={(e) => setDataKey("Фото площадки от шлюза", e.target.value)} />
            </div>

            <div className="row mt-5 mb-5">
              <label className="label" htmlFor="sensor-alerts">Последние значимые алерты</label>
              <input id="sensor-alerts" name="sensor_alerts" className="w-full input" value={safePassport.data["Последние значимые алерты"] || ""} onChange={(e) => setDataKey("Последние значимые алерты", e.target.value)} />
            </div>

            <div className="row mt-5 mb-5">
              <label className="label" htmlFor="sensor-recommendation">Краткая рекомендация от ИИ</label>
              <input id="sensor-recommendation" name="sensor_recommendation" className="w-full input" value={safePassport.data["Краткая рекомендация от ИИ"] || ""} onChange={(e) => setDataKey("Краткая рекомендация от ИИ", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <h6 className="text-sm font-medium mb-5">Дополнительные параметры (пользовательские)</h6>

        <div className="space-y-2">
          {Object.entries(safePassport.data || {})
            .filter(([k]) => !RESERVED_SENSOR_KEYS.includes(k))
            .map(([k, v], idx) => (
              <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
               
                <input
                  id={`custom-key-${idx}`}
                  className="input"
                  name={`custom_key_${idx}`}
                  value={k}
                  readOnly
                  aria-readonly
                  style={{ flexBasis: "66%", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                />
              
                <input
                  id={`custom-val-${idx}`}
                  className="input"
                  name={`custom_val_${idx}`}
                  value={v}
                  onChange={(e) => setDataKey(k, e.target.value)}
                  style={{ flexBasis: "32%", flexShrink: 0, minWidth: 0 }}
                />
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => removeDataKey(k)}
                  aria-label={`Удалить параметр ${k}`}
                  style={{ flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))
          }
        </div>

        <div className="mt-5" style={{ display: "flex", gap: 8 }}>
          <input id="new-param-key" name="new_param_key" className="flex-1 input" placeholder="Название параметра" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
          <input id="new-param-value" name="new_param_value" className="flex-1 input" placeholder="Значение" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
          <button type="button" className="btn" onClick={addCustomParam}>Добавить</button>
        </div>
      </div>
    </div>
  );
}

const getInitialPrice = (initial) => {
  if (!initial) return "";
  return initial.price ?? initial.price_value ?? (initial.price && initial.price.amount) ?? "";
};

export default function ProductForm({ initial = null, user = null, onDone = null, onCancel = null, setMsg = null }) {
  const [name, setName] = useState(initial?.name || "");
  const [shortDescription, setShortDescription] = useState(initial?.short_description || "");
  const [farmId, setFarmId] = useState(initial?.farm_id || "");
  const [farms, setFarms] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passport, setPassport] = useState(initial?.passport ? {
    origin: initial.passport.origin || "",
    variety: initial.passport.variety || "",
    harvest_date: initial.passport.harvest_date ? initial.passport.harvest_date.split("T")[0] : "",
    certifications: Array.isArray(initial.passport.certifications) ? initial.passport.certifications.map(c => ({ ...c })) : [],
    data: { ...(initial.passport.data || {}) }
  } : { origin: "", variety: "", harvest_date: "", certifications: [], data: {} });
  const [passportSaving, setPassportSaving] = useState(false);
  const [price, setPrice] = useState(getInitialPrice(initial));
  const [category, setCategory] = useState(
    initial?.category ?? initial?.category_name ?? initial?.category_id ?? ""
  );

  const categories = [
    "Овощи",
    "Зелень и травы",
    "Фрукты",
    "Ягоды",
    "Грибы",
    "Зерновые и бобовые",
    "Орехи и семена",
  ];

  useEffect(() => {
    async function loadFarms() {
      try {
        const r = await getFarms();
        if (r && r.ok) {
          let list = r.data || [];
          if (user?.role === "farmer") list = list.filter(f => f.owner_id === user.id);
          setFarms(list);
        } else setFarms([]);
      } catch (e) {
        console.error("getFarms error", e);
        setFarms([]);
      }
    }
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (initial?.passport) {
      setPassport({
        origin: initial.passport.origin || "",
        variety: initial.passport.variety || "",
        harvest_date: initial.passport.harvest_date ? initial.passport.harvest_date.split("T")[0] : "",
        certifications: Array.isArray(initial.passport.certifications) ? initial.passport.certifications.map(c => ({ ...c })) : [],
        data: { ...(initial.passport.data || {}) }
      });
    }
  }, [initial]);

  async function savePassportToAPI(productId) {
    setPassportSaving(true);
    try {
      const payload = {
        origin: passport.origin || null,
        variety: passport.variety || null,
        harvest_date: passport.harvest_date || null,
        certifications: passport.certifications || [],
        data: passport.data || {}
      };
      const res = await upsertPassport(productId, payload);
      if (!res || !res.ok) throw new Error(res?.data?.detail || "Ошибка сохранения паспорта");
      return true;
    } finally {
      setPassportSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);

    try {
      if (passport && passport.data && passport.data["Время сбора урожая"]) {
        const val = passport.data["Время сбора урожая"];
        if (typeof val === "string" && /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}\s[0-9]{2}:[0-9]{2}$/.test(val)) {
          const m = val.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
          if (m) {
            const dd = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10) - 1;
            const yyyy = parseInt(m[3], 10);
            const hh = parseInt(m[4], 10);
            const min = parseInt(m[5], 10);
            const d = new Date(yyyy, mm, dd, hh, min);
            if (!isNaN(d.getTime())) {
              passport.data["Время сбора урожая"] = d.toISOString();
            } else {
              passport.data["Время сбора урожая"] = "";
            }
          }
        }
      }

      const priceNum = price !== "" ? Number(price) : null;
      const pricePayload = {};
      if (priceNum != null && !Number.isNaN(priceNum)) {
        pricePayload.price = priceNum; 
        pricePayload.price_value = priceNum; 
        pricePayload.price_cents = Math.round(priceNum * 100);
      }

      const payload = {
        name,
        short_description: shortDescription,
        farm_id: farmId || null,
        category: category || undefined,
        ...pricePayload
      };

      let resultProduct = null;
      let res;

      if (initial && initial.id) {
        res = await updateProduct(initial.id, payload);
        console.log("UPDATE product response:", res);
        if (!res || !res.ok) throw new Error(res?.data?.detail || "Ошибка обновления товара");
        resultProduct = res.data;
      } else {
        res = await createProduct(payload);
        console.log("CREATE product response:", res);
        if (!res || !res.ok || !res.data?.id) {
          throw new Error(res?.data?.detail || "Ошибка создания товара");
        }
        resultProduct = res.data;
      }

      try {
        const full = await getProduct(resultProduct.id);
        console.log("GET full product after create/update:", full);
        if (full && full.ok && full.data) resultProduct = full.data;
      } catch (errGet) {
        console.warn("Не удалось получить полный продукт после создания/обновления:", errGet);
      }

      await savePassportToAPI(resultProduct.id);

      if (file) {
        try {
          const up = await uploadProductMediaDirect(resultProduct.id, file, true);
          if (!up || up.ok === false) throw new Error(up?.data?.detail || "Ошибка загрузки файла");
          const objectKey = up.data?.object_key;
          const confirm = await confirmMediaUpload(resultProduct.id, { object_key: objectKey, is_primary: true, mime_type: file.type, meta: {} });
          if (!confirm || !confirm.ok) throw new Error(confirm?.data?.detail || "Ошибка подтверждения медиа");
        } catch (err) {
          console.warn("media upload error", err);
          setMsg && setMsg("Товар создан, но не удалось загрузить фото: " + (err.message || err));
          setLoading(false);
          onDone && onDone(resultProduct);
          return;
        }
      }

      setMsg && setMsg(initial ? "Товар обновлён" : "Товар создан");
      onDone && onDone(resultProduct);
    } catch (err) {
      console.error("handleSubmit error:", err);
      setMsg && setMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="p-7 border-1 border-gray-200 w-full rounded-3xl justify-center mx-auto max-w-[1300px]" onSubmit={handleSubmit} noValidate>
        <h2 className="text-xl font-semibold mb-4">{initial ? "Редактировать товар" : "Создать товар"}</h2>

        <div className="mb-5 row">
          <label className="label" htmlFor="product-name">Название</label>
          <input id="product-name" name="product_name" className="w-full input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="" />
        </div>

        <div className="mb-5 row">
          <label className="label" htmlFor="product-short">Короткое описание</label>
          <input id="product-short" name="product_short_description" className="w-full input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="" />
        </div>

        <div className="mb-5 row">
          <label className="label" htmlFor="product-short">Цена</label>
          <input id="product-short" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="input mb-3"/>

          <label className="flex flex-col">
            <label className="label" htmlFor="product-short">Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required className="border rounded-lg p-2">
              <option value="">Выберите категорию</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-5 row">
          <label className="label" htmlFor="product-farm">Ферма</label>
          <select id="product-farm" name="product_farm_id" className="w-full input" value={farmId ?? ""} onChange={(e) => setFarmId(e.target.value)}>
            <option value="">— Выберите ферму —</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div className="mb-5 row">
          <label className="label" htmlFor="product-photo">Фото (опционально)</label>
          <input id="product-photo" name="product_photo" type="file" className="input" onChange={e => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} accept="image/*" />
        </div>

        <ProductPassportForm passport={passport} onChange={(p) => setPassport(p)} />

        <div className="mt-7 flex flex-row max-w-[500px]">
          <button className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] w-full transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left cursor-pointer bg-[#3E8D43]/17" type="submit" disabled={loading || passportSaving}>{loading ? "Сохранение..." : (initial ? "Сохранить" : "Создать")}</button>
          {onCancel && <button type="button" className="w-full px-4 py-2 rounded-lg bg-gray-200 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200" style={{ marginLeft: 8 }} onClick={onCancel}>Отмена</button>}
        </div>
      </form>
      <div className="mt-15">
        <Footer />
      </div>
    </div>
  );
}
