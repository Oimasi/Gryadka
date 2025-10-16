// src/components/ProductsList.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { getProducts, getMyProducts } from "../api";

export default function ProductsList({ q, user, onOpen, onEdit, onDelete, my=false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = my ? await getMyProducts() : await getProducts({ q });
      if (r.ok) setList(r.data || []);
      else setList([]);
    } catch (e) { setList([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [q]);

  return (
    <div>
      <h3>Каталог</h3>
      {loading ? <div>Загрузка...</div> : list.length === 0 ? <div>Пусто</div> : list.map(p => (
        <ProductCard key={p.id} product={p} user={user} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
