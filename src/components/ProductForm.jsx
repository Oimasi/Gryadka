// src/components/ProductForm.jsx
import React, { useEffect, useState } from "react";
import {
  createProduct,
  updateProduct,
  uploadProductMediaDirect,
  confirmMediaUpload,
  upsertPassport,
  getFarms
} from "../api";


// Компонент для отдельного сертификата
function CertificateItem({ cert, onChange, onRemove }) {
  const idBase = cert._uid ? `cert-${cert._uid}` : `cert-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="p-3 mb-3 border rounded bg-white" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>Сертификат</strong>
        <button type="button" className="text-sm text-red-600" onClick={onRemove}>Удалить</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="label" htmlFor={`${idBase}-name`}>Название</label>
        <input id={`${idBase}-name`} name={`cert_name_${cert._uid || ""}`} className="w-full input" value={cert.name || ""} onChange={(e) => onChange({ ...cert, name: e.target.value })} placeholder="" required />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="label" htmlFor={`${idBase}-issuer`}>Выдан</label>
        <input id={`${idBase}-issuer`} name={`cert_issuer_${cert._uid || ""}`} className="w-full input" value={cert.issuer || ""} onChange={(e) => onChange({ ...cert, issuer: e.target.value })} placeholder="" required />
      </div>

      <div style={{ marginBottom: 8 }}>
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
  // защитный дефолт
  const safePassport = passport || { origin: "", variety: "", harvest_date: "", certifications: [], data: {} };

  // Зарезервированные ключи для датчиков
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

  // генератор uid для сертификатов
  const genUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Если у входящих сертификатов нет _uid — присвоим им устойчивые id (один раз).
  useEffect(() => {
    if (!passport) return;
    const needAssign = (passport.certifications || []).some(c => !c._uid);
    if (needAssign) {
      const arr = (passport.certifications || []).map(c => c._uid ? c : { ...c, _uid: genUid() });
      onChange && onChange({ ...safePassport, certifications: arr });
    }
    
  }, []); // выполняется один раз при монтировании формы

  // Установка значения поля паспорта
  const setField = (changes) => onChange && onChange({ ...safePassport, ...changes });
  // Установка значения в data
  const setDataKey = (k, v) => onChange && onChange({ ...safePassport, data: { ...(safePassport.data || {}), [k]: v } });
  // Удаление значения из data
  const removeDataKey = (k) => {
    if (RESERVED_SENSOR_KEYS.includes(k)) return;
    const d = { ...(safePassport.data || {}) };
    delete d[k];
    onChange && onChange({ ...safePassport, data: d });
  };

  const sensorsEnabled = Boolean((safePassport.data || {})["Есть датчики"]);

  // Включение датчиков с дефолтными значениями
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

  // Добавление сертификата
  const addCertificate = () => {
    const newCert = { _uid: genUid(), name: "", issuer: "", date: "", notes: "" };
    const arr = [...(safePassport.certifications || []), newCert];
    onChange && onChange({ ...safePassport, certifications: arr });
  };
  // Обновление сертификата
  const updateCertificate = (i, cert) => {
    const arr = [...(safePassport.certifications || [])];
    arr[i] = cert;
    onChange && onChange({ ...safePassport, certifications: arr });
  };
  // Удаление сертификата
  const removeCertificate = (i) => {
    const arr = (safePassport.certifications || []).filter((_, idx) => idx !== i);
    onChange && onChange({ ...safePassport, certifications: arr });
  };

  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  // Добавление пользовательского параметра
  const addCustomParam = () => {
    if (!customKey) return;
    if (RESERVED_SENSOR_KEYS.includes(customKey)) {
      setCustomKey("");
      setCustomValue("");
      return;
    }
    const d = { ...(safePassport.data || {}), [customKey]: customValue };
    onChange && onChange({ ...safePassport, data: d });
    setCustomKey("");
    setCustomValue("");
  };

  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold mb-3">Паспорт товара</h4>

      {/* Поле происхождения */}
      <div className="mb-3 row">
        <label className="label" htmlFor="passport-origin">Происхождение</label>
        <input id="passport-origin" name="passport_origin" className="w-full input" value={safePassport.origin || ""} onChange={(e) => setField({ origin: e.target.value })} placeholder="" />
      </div>

      {/* Поле сорта/вида */}
      <div className="mb-3 row">
        <label className="label" htmlFor="passport-variety">Сорт / вид</label>
        <input id="passport-variety" name="passport_variety" className="w-full input" value={safePassport.variety || ""} onChange={(e) => setField({ variety: e.target.value })} placeholder="" />
      </div>

      {/* Поле даты сбора урожая */}
      <div className="mb-4 row">
        <label className="label" htmlFor="passport-harvest">Дата сбора урожая</label>
        <input id="passport-harvest" name="passport_harvest_date" type="date" className="w-full input" value={safePassport.harvest_date || ""} onChange={(e) => setField({ harvest_date: e.target.value })} />
      </div>

      {/* Секция сертификатов */}
      <div className="mb-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h5 className="font-medium">Сертификаты</h5>
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

      {/* Секция датчиков */}
      <div className="mb-4 border-t pt-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h5 className="font-medium">Датчики / сенсоры</h5>
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
            {/* Поля для pH */}
            <div className="responsive-grid">
              <div className="row">
                <label className="label" htmlFor="sensor-avg-ph">Средний pH за время выращивания</label>
                <input id="sensor-avg-ph" name="sensor_avg_ph" className="w-full input" type="number" step="0.01" value={safePassport.data["Средний pH за время выращивания"] || ""} onChange={(e) => setDataKey("Средний pH за время выращивания", e.target.value)} required />
              </div>

              <div className="row">
                <label className="label" htmlFor="sensor-ph-out"> % измерений pH вне допустимого диапазона</label>
                <input id="sensor-ph-out" name="sensor_ph_out_of_range" className="w-full input" type="number" step="0.1" value={safePassport.data["% измерений pH вне допустимого диапазона"] || ""} onChange={(e) => setDataKey("% измерений pH вне допустимого диапазона", e.target.value)} required />
              </div>
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-ph-rating">Оценка pH</label>
              <select id="sensor-ph-rating" name="sensor_ph_rating" className="w-full input" value={safePassport.data["Оценка pH"] || ""} onChange={(e) => setDataKey("Оценка pH", e.target.value)} required>
                <option value="">— выберите —</option>
                <option value="Хорошая">Хорошая</option>
                <option value="Средняя">Средняя</option>
                <option value="Плохая">Плохая</option>
              </select>
            </div>

            {/* Поля для солености */}
            <div className="responsive-grid" style={{ marginTop: 8 }}>
              <div className="row">
                <label className="label" htmlFor="sensor-last-salinity">Последняя соленость почвы</label>
                <input id="sensor-last-salinity" name="sensor_last_salinity" className="w-full input" type="number" step="0.01" value={safePassport.data["Последняя соленость почвы"] || ""} onChange={(e) => setDataKey("Последняя соленость почвы", e.target.value)} />
              </div>
              <div className="row">
                <label className="label" htmlFor="sensor-avg-salinity">Средняя соленость почвы за время выращивания</label>
                <input id="sensor-avg-salinity" name="sensor_avg_salinity" className="w-full input" type="number" step="0.01" value={safePassport.data["Средняя соленость почвы за время выращивания"] || ""} onChange={(e) => setDataKey("Средняя соленость почвы за время выращивания", e.target.value)} />
              </div>
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-salinity-rating">Оценка солености почвы</label>
              <select id="sensor-salinity-rating" name="sensor_salinity_rating" className="w-full input" value={safePassport.data["Оценка солености почвы"] || ""} onChange={(e) => setDataKey("Оценка солености почвы", e.target.value)}>
                <option value="">— выберите —</option>
                <option value="Хорошая">Хорошая</option>
                <option value="Средняя">Средняя</option>
                <option value="Плохая">Плохая</option>
              </select>
            </div>

            {/* Поля для температуры */}
            <div className="responsive-grid" style={{ marginTop: 8 }}>
              <div className="row">
                <label className="label" htmlFor="sensor-avg-temp">Средняя температура за время выращивания</label>
                <input id="sensor-avg-temp" name="sensor_avg_temp" className="w-full input" value={safePassport.data["Средняя температура за время выращивания"] || ""} onChange={(e) => setDataKey("Средняя температура за время выращивания", e.target.value)} />
              </div>
              <div className="row">
                <label className="label" htmlFor="sensor-temp-spikes">Наличие резких перепадов температуры</label>
                <select id="sensor-temp-spikes" name="sensor_temp_spikes" className="w-full input" value={safePassport.data["Наличие резких перепадов температуры"] || ""} onChange={(e) => setDataKey("Наличие резких перепадов температуры", e.target.value)}>
                  <option value="">— выберите —</option>
                  <option value="Да">Да</option>
                  <option value="Нет">Нет</option>
                </select>
              </div>
            </div>

            {/* Поля для других параметров датчиков */}
            <div className="row">
              <label className="label" htmlFor="sensor-harvest-time">Время сбора урожая (по данным)</label>
              <input id="sensor-harvest-time" name="sensor_harvest_time" className="w-full input" value={safePassport.data["Время сбора урожая"] || ""} onChange={(e) => setDataKey("Время сбора урожая", e.target.value)} />
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-ph-calibrated">Дата последней калибровки pH-электродов</label>
              <input id="sensor-ph-calibrated" name="sensor_ph_calibrated" type="date" className="w-full input" value={safePassport.data["Дата последней калибровки pH-электродов"] || ""} onChange={(e) => setDataKey("Дата последней калибровки pH-электродов", e.target.value)} />
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-coords">Местоположение точки (координаты участка)</label>
              <input id="sensor-coords" name="sensor_coords" className="w-full input" value={safePassport.data["Местоположение точки ( координаты участка)"] || ""} onChange={(e) => setDataKey("Местоположение точки ( координаты участка)", e.target.value)} placeholder="lat,lon" />
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-gateway-photo">Фото площадки от шлюза (ссылка / описание)</label>
              <input id="sensor-gateway-photo" name="sensor_gateway_photo" className="w-full input" value={safePassport.data["Фото площадки от шлюза"] || ""} onChange={(e) => setDataKey("Фото площадки от шлюза", e.target.value)} />
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-alerts">Последние значимые алерты</label>
              <input id="sensor-alerts" name="sensor_alerts" className="w-full input" value={safePassport.data["Последние значимые алерты"] || ""} onChange={(e) => setDataKey("Последние значимые алерты", e.target.value)} />
            </div>

            <div className="row">
              <label className="label" htmlFor="sensor-recommendation">Краткая рекомендация от ИИ</label>
              <input id="sensor-recommendation" name="sensor_recommendation" className="w-full input" value={safePassport.data["Краткая рекомендация от ИИ"] || ""} onChange={(e) => setDataKey("Краткая рекомендация от ИИ", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Секция пользовательских параметров */}
      <div className="mt-4">
        <h6 className="text-sm font-medium mb-2">Дополнительные параметры (пользовательские)</h6>

        <div className="space-y-2">
          {Object.entries(safePassport.data || {})
            .filter(([k]) => !RESERVED_SENSOR_KEYS.includes(k))
            .map(([k, v], idx) => (
              <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id={`custom-key-${idx}`} className="w-1-3 input" name={`custom_key_${idx}`} value={k} readOnly aria-readonly />
                <input id={`custom-val-${idx}`} className="flex-1 input" name={`custom_val_${idx}`} value={v} onChange={(e) => setDataKey(k, e.target.value)} />
                <button type="button" className="text-red-600" onClick={() => removeDataKey(k)}>✕</button>
              </div>
            ))
          }
        </div>

        <div className="mt-3" style={{ display: "flex", gap: 8 }}>
          <input id="new-param-key" name="new_param_key" className="flex-1 input" placeholder="Название параметра" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
          <input id="new-param-value" name="new_param_value" className="flex-1 input" placeholder="Значение" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
          <button type="button" className="btn" onClick={addCustomParam}>Добавить</button>
        </div>
      </div>
    </div>
  );
}


export default function ProductForm({ initial = null, user = null, onDone = null, onCancel = null, setMsg = null }) {
  // Состояния формы
  const [name, setName] = useState(initial?.name || "");
  const [shortDescription, setShortDescription] = useState(initial?.short_description || "");
  const [farmId, setFarmId] = useState(initial?.farm_id || "");
  const [farms, setFarms] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // Состояние паспорта
  const [passport, setPassport] = useState(initial?.passport ? {
    origin: initial.passport.origin || "",
    variety: initial.passport.variety || "",
    harvest_date: initial.passport.harvest_date ? initial.passport.harvest_date.split("T")[0] : "",
    certifications: Array.isArray(initial.passport.certifications) ? initial.passport.certifications.map(c => ({ ...c })) : [],
    data: { ...(initial.passport.data || {}) }
  } : { origin: "", variety: "", harvest_date: "", certifications: [], data: {} });
  const [passportSaving, setPassportSaving] = useState(false);

  // Загрузка ферм при монтировании компонента
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

  // Если initial меняется (например, редактирование другого товара), обновим локальный стейт passport
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

  // Сохранение паспорта в API
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

  // Обработка отправки формы
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);

    try {
      const payload = { name, short_description: shortDescription, farm_id: farmId || null };
      let resultProduct = null;

      if (initial && initial.id) {
        const res = await updateProduct(initial.id, payload);
        if (!res || !res.ok) throw new Error(res?.data?.detail || "Ошибка обновления товара");
        resultProduct = res.data;
      } else {
        const res = await createProduct(payload);
        if (!res || !res.ok || !res.data?.id) throw new Error(res?.data?.detail || "Ошибка создания товара");
        resultProduct = res.data;
      }

      // Сохранение паспорта
      await savePassportToAPI(resultProduct.id);

      // Загрузка медиа файла, если он предоставлен
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
      console.error(err);
      setMsg && setMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="p-4 bg-gray-50 rounded" onSubmit={handleSubmit} noValidate>
      <h2 className="text-xl font-semibold mb-4">{initial ? "Редактировать товар" : "Создать товар"}</h2>

      {/* Поле названия */}
      <div className="mb-3 row">
        <label className="label" htmlFor="product-name">Название</label>
        <input id="product-name" name="product_name" className="w-full input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="" />
      </div>

      {/* Поле короткого описания */}
      <div className="mb-3 row">
        <label className="label" htmlFor="product-short">Короткое описание</label>
        <input id="product-short" name="product_short_description" className="w-full input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="" />
      </div>

      {/* Поле выбора фермы */}
      <div className="mb-3 row">
        <label className="label" htmlFor="product-farm">Ферма</label>
        <select id="product-farm" name="product_farm_id" className="w-full input" value={farmId ?? ""} onChange={(e) => setFarmId(e.target.value)}>
          <option value="">— Выберите ферму —</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Поле загрузки фото */}
      <div className="mb-3 row">
        <label className="label" htmlFor="product-photo">Фото (опционально)</label>
        <input id="product-photo" name="product_photo" type="file" className="input" onChange={e => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} accept="image/*" />
      </div>

      {/* Передаём passport как контролируемый prop и onChange — избегаем двойной синхронизации */}
      <ProductPassportForm passport={passport} onChange={(p) => setPassport(p)} />

      {/* Кнопки формы */}
      <div className="mt-4 row">
        <button className="btn" type="submit" disabled={loading || passportSaving}>{loading ? "Сохранение..." : (initial ? "Сохранить" : "Создать")}</button>
        {onCancel && <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}
