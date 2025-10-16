// src/components/ProductForm.jsx
import React, { useEffect, useState } from "react";
import {
  createProduct,
  updateProduct,
  getFarms as apiGetFarms,
  uploadProductMedia,
  upsertPassport // Добавляем новый метод для обновления паспорта
} from "../api";

// Компонент для редактирования сертификата
const CertificateItem = ({ cert, onChange, onRemove, index }) => {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span>Сертификат #{index + 1}</span>
        <button className="btn" type="button" onClick={onRemove} style={{ fontSize: 12 }}>
          Удалить
        </button>
      </div>
      <div className="row">
        <label className="small">Название</label>
        <input
          className="input"
          value={cert.name || ""}
          onChange={(e) => onChange({ ...cert, name: e.target.value })}
          required
          placeholder="Название сертификата"
        />
      </div>
      <div className="row">
        <label className="small">Выдан</label>
        <input
          className="input"
          value={cert.issuer || ""}
          onChange={(e) => onChange({ ...cert, issuer: e.target.value })}
          required
          placeholder="Организация, выдавшая сертификат"
        />
      </div>
      <div className="row">
        <label className="small">Дата</label>
        <input
          type="date"
          className="input"
          value={cert.date || ""}
          onChange={(e) => onChange({ ...cert, date: e.target.value })}
        />
      </div>
      <div className="row">
        <label className="small">Примечания</label>
        <input
          className="input"
          value={cert.notes || ""}
          onChange={(e) => onChange({ ...cert, notes: e.target.value })}
          placeholder="Дополнительные сведения"
        />
      </div>
    </div>
  );
};

// Компонент для паспорта товара
const ProductPassportForm = ({ initialPassport, onChange }) => {
  const [passportData, setPassportData] = useState({
    origin: "",
    variety: "",
    harvest_date: "",
    certifications: [],
    data: {}
  });

  // Инициализация данных при монтировании компонента
  useEffect(() => {
    if (initialPassport) {
      setPassportData({
        origin: initialPassport.origin || "",
        variety: initialPassport.variety || "",
        harvest_date: initialPassport.harvest_date ? 
          new Date(initialPassport.harvest_date).toISOString().split('T')[0] : "",
        certifications: [...initialPassport.certifications] || [],
        data: { ...initialPassport.data } || {}
      });
    }
  }, [initialPassport]);

  // Обновление данных паспорта при изменении
  useEffect(() => {
    onChange(passportData);
  }, [passportData, onChange]);

  const handleAddCertificate = () => {
    setPassportData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { name: "", issuer: "", date: "", notes: "" }
      ]
    }));
  };

  const handleUpdateCertificate = (index, cert) => {
    setPassportData(prev => {
      const newCerts = [...prev.certifications];
      newCerts[index] = cert;
      return { ...prev, certifications: newCerts };
    });
  };

  const handleRemoveCertificate = (index) => {
    setPassportData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="form" style={{ marginTop: 20 }}>
      <h4>Паспорт товара</h4>
      
      <div className="row">
        <label className="small">Происхождение</label>
        <input
          className="input"
          value={passportData.origin}
          onChange={(e) => setPassportData({ ...passportData, origin: e.target.value })}
          placeholder="Например: Московская область"
        />
      </div>
      
      <div className="row">
        <label className="small">Сорт/вид</label>
        <input
          className="input"
          value={passportData.variety}
          onChange={(e) => setPassportData({ ...passportData, variety: e.target.value })}
          placeholder="Например: Мелита F1"
        />
      </div>
      
      <div className="row">
        <label className="small">Дата сбора урожая</label>
        <input
          type="date"
          className="input"
          value={passportData.harvest_date}
          onChange={(e) => setPassportData({ ...passportData, harvest_date: e.target.value })}
        />
      </div>
      
      <div style={{ marginTop: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h5>Сертификаты</h5>
          <button className="btn" type="button" onClick={handleAddCertificate} style={{ fontSize: 12 }}>
            + Добавить
          </button>
        </div>
        
        {passportData.certifications.length === 0 ? (
          <div className="small" style={{ color: "#666", textAlign: "center", padding: 15 }}>
            Нет сертификатов
          </div>
        ) : (
          passportData.certifications.map((cert, index) => (
            <CertificateItem
              key={index}
              cert={cert}
              index={index}
              onChange={(updatedCert) => handleUpdateCertificate(index, updatedCert)}
              onRemove={() => handleRemoveCertificate(index)}
            />
          ))
        )}
      </div>
      
      <div style={{ marginTop: 15 }}>
        <h5>Дополнительные данные</h5>
        <div className="small" style={{ color: "#666", marginBottom: 8 }}>
          Дополнительные параметры, которые могут быть полезны для потребителей
        </div>
        
        {Object.entries(passportData.data).map(([key, value], index) => (
          <div key={index} className="row" style={{ marginBottom: 5 }}>
            <input
              className="input"
              style={{ width: "30%" }}
              value={key}
              onChange={(e) => {
                const newData = { ...passportData.data };
                const oldValue = newData[key];
                delete newData[key];
                newData[e.target.value] = oldValue;
                setPassportData({ ...passportData, data: newData });
              }}
              placeholder="Параметр"
            />
            <input
              className="input"
              style={{ width: "65%" }}
              value={value}
              onChange={(e) => {
                const newData = { ...passportData.data };
                newData[key] = e.target.value;
                setPassportData({ ...passportData, data: newData });
              }}
              placeholder="Значение"
            />
            <button
              className="btn"
              type="button"
              onClick={() => {
                const newData = { ...passportData.data };
                delete newData[key];
                setPassportData({ ...passportData, data: newData });
              }}
              style={{ width: "5%", padding: "0 5px" }}
            >
              ✕
            </button>
          </div>
        ))}
        
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setPassportData({
                ...passportData,
                data: { ...passportData.data, "": "" }
              });
            }}
            style={{ fontSize: 12 }}
          >
            + Добавить параметр
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProductForm({ initial = null, user, onDone, setMsg }) {
  const [name, setName] = useState(initial?.name || "");
  const [shortDescription, setShortDescription] = useState(initial?.short_description || "");
  const [farmId, setFarmId] = useState(initial?.farm_id || "");
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [passportData, setPassportData] = useState({
    origin: "",
    variety: "",
    harvest_date: "",
    certifications: [],
    data: {}
  });
  const [passportSaving, setPassportSaving] = useState(false);

  useEffect(() => {
    async function loadFarms() {
      try {
        const r = await apiGetFarms();
        if (r && r.ok) {
          let list = r.data || [];
          if (user?.role === "farmer") list = list.filter((f) => f.owner_id === user.id);
          setFarms(list);
        } else {
          setFarms([]);
        }
      } catch (err) {
        console.error("loadFarms err", err);
        setFarms([]);
      }
    }
    loadFarms();
  }, [user]);

  // Заполняем паспорт при редактировании существующего продукта
  useEffect(() => {
    if (initial && initial.passport) {
      setPassportData({
        origin: initial.passport.origin || "",
        variety: initial.passport.variety || "",
        harvest_date: initial.passport.harvest_date ? 
          new Date(initial.passport.harvest_date).toISOString().split('T')[0] : "",
        certifications: [...initial.passport.certifications] || [],
        data: { ...initial.passport.data } || {}
      });
    }
  }, [initial]);

  async function savePassport(productId) {
    setPassportSaving(true);
    try {
      // Форматируем данные паспорта
      const payload = {
        origin: passportData.origin || null,
        variety: passportData.variety || null,
        harvest_date: passportData.harvest_date ? new Date(passportData.harvest_date) : null,
        certifications: passportData.certifications,
        data: passportData.data
      };
      
      const response = await upsertPassport(productId, payload);
      
      if (response.ok) {
        return true;
      } else {
        const error = response.data?.detail || "Ошибка сохранения паспорта";
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error saving passport:", error);
      throw error;
    } finally {
      setPassportSaving(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMsg && setMsg(null);
    setLoading(true);
    
    try {
      const payload = { name, short_description: shortDescription, farm_id: farmId || null };
      let createdProduct = null;
      
      if (initial && initial.id) {
        const r = await updateProduct(initial.id, payload);
        if (!r || !r.ok) {
          const errtext = (r && r.data && (r.data.detail || JSON.stringify(r.data))) || `Ошибка обновления: ${r?.status}`;
          throw new Error(errtext);
        }
        createdProduct = r.data;
      } else {
        const newProd = await createProduct(payload);
        if (!newProd || !newProd.id) throw new Error("Создание продукта вернуло неверный ответ");
        createdProduct = newProd;
      }
      
      // Сохраняем паспорт
      await savePassport(createdProduct.id);
      
      // Загружаем изображение, если есть
      if (file) {
        try {
          const upRes = await uploadProductMedia(createdProduct.id, file, true);
          if (upRes && upRes.ok === false) {
            throw new Error((upRes.data && upRes.data.detail) || "Ошибка загрузки изображения");
          }
        } catch (errFile) {
          console.warn("Ошибка при загрузке медиа:", errFile);
          setMsg && setMsg("Продукт создан, но не удалось загрузить изображение: " + errFile.message);
          setLoading(false);
          onDone && onDone(createdProduct);
          return;
        }
      }
      
      setMsg && setMsg(initial ? "Товар и паспорт обновлены" : "Товар и паспорт созданы");
      onDone && onDone(createdProduct);
    } catch (err) {
      console.error(err);
      const text = (err && err.message) || String(err);
      setMsg && setMsg(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{initial ? "Редактировать товар" : "Создать товар"}</h3>
      
      <div className="row">
        <label className="small">Название</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Название товара"
        />
      </div>
      
      <div className="row">
        <label className="small">Короткое описание</label>
        <input
          className="input"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="Краткое описание (опционально)"
        />
      </div>
      
      <div className="row">
        <label className="small">Ферма</label>
        <select
          className="input"
          value={farmId ?? ""}
          required
          onChange={(e) => setFarmId(e.target.value ? parseInt(e.target.value, 10) : "")}
        >
          <option value="">— выберите ферму —</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name || `Ферма ${f.id}`}
            </option>
          ))}
        </select>
      </div>
      
      <div className="row">
        <label className="small">Фото (опционально)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      
      <ProductPassportForm 
        initialPassport={initial?.passport} 
        onChange={setPassportData} 
      />
      
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" type="submit" disabled={loading || passportSaving}>
          {loading ? "Сохранение..." : initial ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}