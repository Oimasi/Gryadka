import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { getProducts, getMyProducts } from "../../api";
import Dropdown from "../ui/dropdown";
import { Footer } from "./Footer";

export default function ProductsList({
  q,
  user,
  categoryFilterActive = false,
  category,
  onOpen,
  onEdit,
  onDelete,
  my = false,
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const options = ["Популярные", "Сначала дешевле"];
  const [sortType, setSortType] = useState("Популярные");

  const getPrice = (p) => {
    if (p.price != null) return Number(p.price);
    return 0;
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = my ? await getMyProducts() : await getProducts({ q });
      if (r.ok) {
        let products = r.data || [];

        if (category && categoryFilterActive) {
          const targetCat = category.toLowerCase().trim();
          products = products.filter((p) => {
            const pCat = (p.category || "")
              .toString()
              .toLowerCase()
              .trim();
            return pCat === targetCat;
          });
        }

        if (q) {
          const ql = q.toLowerCase().trim();
          products = products.filter((p) =>
            (p.name || "").toLowerCase().includes(ql)
          );
        }

        if (sortType === "Сначала дешевле") {
          products = products.sort((a, b) => getPrice(a) - getPrice(b));
        }

        setList(products);
      } else {
        setList([]);
      }
    } catch (e) {
      setList([]);
      console.error("Ошибка загрузки продуктов:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [q, category, sortType, categoryFilterActive]);

  return (
    <div>
      <div className="bg-white flex flex-col gap-4 max-w-[1330px] my-4 mx-auto px-4">
        <h2 className="text-xl font-semibold text-black">
          {(category && categoryFilterActive) ? category : "Все товары"}
        </h2>

        <div className="flex flex-row justify-between">
          <Dropdown
            options={options}
            selected={sortType}
            onSelect={(value) => setSortType(value)}
            label={sortType}
          />
        </div>

        {loading ? (
          <div>Загрузка...</div>
        ) : list.length === 0 ? (
          <div>Не найдены</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mt-6 gap-6 w-full">
            {list.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                user={user}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
      <div className="max-w-[1300px] justify-center items-center mx-auto">
        <Footer />
      </div>
    </div>
  );
}
