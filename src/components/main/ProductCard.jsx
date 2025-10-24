import React, { useEffect, useState } from "react";
import { fetchImageAsObjectURL } from "../../api";
import { addItem } from "../../hooks/useCart";
import basket from "/images/basket-white.svg"
import ProductDropdown from "../ui/productdropdown";

export default function ProductCard({ product, user, onOpen, onEdit, onDelete }) {
  const primary = (product.media && product.media.find(m => m.is_primary)) || null;
  const thumbPresigned = primary ? primary.presigned_url : null;
  const mediaId = primary ? primary.id : null;

  const [imgSrc, setImgSrc] = useState(thumbPresigned || null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [qty, setQty] = useState(0);

  const rawPrice = product.price ?? null;

  const priceVal = rawPrice != null ? Number(rawPrice) : null;
  const priceStr = priceVal != null ? `${priceVal.toLocaleString("ru-RU")} ₽` : "100₽";

  const category = product.category || "";

  const stock = product.stock ?? product.quantity ?? product.available ?? null;
  const inStock = stock == null ? true : stock > 0;

  const canEdit = user && (user.role === "admin" || user.id === product.owner_id);


  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    async function loadFallback() {
      if (thumbPresigned) {
        if (mounted) setImgSrc(thumbPresigned);
        return;
      }
      if (!mediaId) {
        if (mounted) setImgSrc(null);
        return;
      }

      if (mounted) setLoadingImg(true);
      try {
        const obj = await fetchImageAsObjectURL(`/api/products/media/${mediaId}/file`);
        if (!mounted) {
          if (obj) URL.revokeObjectURL(obj);
          return;
        }
        if (obj) {
          objectUrl = obj;
          setImgSrc(objectUrl);
        } else {
          setImgSrc(null);
        }
      } catch (e) {
        if (mounted) setImgSrc(null);
      } finally {
        if (mounted) setLoadingImg(false);
      }
    }

    loadFallback();

    return () => {
      mounted = false;
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      }
    };
  }, [thumbPresigned, mediaId]);

  function handleAdd() {
    if (!inStock) return;
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

  return (
    <div onClick={() => onOpen?.(product)} className="bg-[#ffffff] border-1 border-[#F2F2F2] rounded-2xl overflow-hidden transition cursor-pointer flex flex-col w-full">
      <div className="relative w-full h-full max-h-[240px] bg-gray-100 flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name || "product"} className="object-cover max-h-[240px] w-full" />
        ) : (
          <span className="text-gray-400 text-sm w-full text-center justify-center mb-60 mt-64 items-center">{loadingImg ? "Загрузка..." : "Нет фото"}</span>
        )}
        <p className="absolute left-6 top-5 rounded-4xl bg-[#ffffff] text-[#000000] text-[12px] py-1.5 px-5 mb-1">
          {product.farm_name || "ФермаЗаповедъ"}
        </p>
        <div className="absolute right-6 top-5">
          <ProductDropdown product={product} user={user} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete}/>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 justify-between">
        <div>
          <div className="flex flex-row">
            <div className="flex flex-col">
              <h3 className="text-[18px] font-medium text-gray-900">
                {product.name || "Без названия"}
              </h3>
              <div className="flex flex-row">
                <p className="text-[#3E8D43] text-[18px] font-medium mt-1">{priceStr}</p>
                <p className="text-[#A6A6A6] text-[14px] font-medium ml-1 mt-2">кг</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end ml-auto">
              {qty === 0 ? (
                <button onClick={(e) => { e.stopPropagation(); handleAdd(); }} disabled={!inStock} className="bg-[#3E8D43] w-[46px] h-[46px] items-center justify-center bg-none active:bg-[#3E8D43]/70 transition-all duration-150 hover:bg-[#3E8D43]/70 rounded-4xl cursor-pointer">
                    <img src={basket} className="flex ml-[14px]"/>
                </button>
              ) : (
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); changeQty(-1); }}
                    className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    −
                  </button>
                  <span className="font-medium text-lg w-6 text-center">{qty}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); changeQty(1); }}
                    className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
