import React, { useEffect, useState } from "react";
import { fetchImageAsObjectURL } from "../../api";
import { addItem } from "../../hooks/useCart";
import basket from "/images/basket-white.svg";
import ProductDropdown from "../ui/productdropdown";

export default function ProductCard({ product, user, onOpen, onEdit, onDelete, variant = "" }) {
  const isNews = variant === "news";

  const primary = (product.media && product.media.find(m => m.is_primary)) || null;
  const thumbPresigned = primary ? primary.presigned_url : null;
  const mediaId = primary ? primary.id : null;

  const [imgSrc, setImgSrc] = useState(thumbPresigned || null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [qty, setQty] = useState(0);

  const rawPrice = product.price ?? null;
  const priceVal = rawPrice != null ? Number(rawPrice) : null;
  const priceStr = priceVal != null ? `${priceVal.toLocaleString("ru-RU")} ₽` : "100₽";

  const stock = product.stock ?? product.quantity ?? product.available ?? null;
  const inStock = stock == null ? true : stock > 0;

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
    <div
      onClick={() => onOpen?.(product)}
      className="bg-[#ffffff] border-1 border-[#F2F2F2] rounded-2xl overflow-hidden transition cursor-pointer flex flex-col w-full h-full"
    >
      <div className="relative w-full h-[120px] sm:h-[200px] md:h-[240px] bg-gray-100 flex items-center justify-center">
        {imgSrc ? (
          isNews ? (
            <div
              role="img"
              aria-label={product.name || "product"}
              className="w-full h-full bg-center bg-contain bg-no-repeat"
              style={{ backgroundImage: `url(${imgSrc})` }}
            />
          ) : (
            <img
              src={imgSrc}
              alt={product.name || "product"}
              className="object-cover object-center w-full h-full"
              style={{ transform: 'translateZ(0)' }}
            />
          )
        ) : (
          <span className="text-gray-400 text-[12px] w-full text-center flex items-center justify-center">
            {loadingImg ? "Загрузка." : "Нет фото"}
          </span>
        )}

        <p className={`absolute left-3 top-3 rounded-4xl bg-white text-black ${isNews ? 'text-[9px] sm:text-[11px] py-1 px-3' : 'text-[11px] sm:text-[12px] py-1 px-3'}`}>
          {product.farm_name || "ФермаЗаповедъ"}
        </p>

        <div className="absolute right-3 top-3">
          <ProductDropdown product={product} user={user} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete}/>
        </div>
      </div>

      <div className={`${isNews ? 'p-3' : 'p-4'} flex flex-col gap-2 justify-between flex-1`}>
        <div className="flex flex-row w-full">
          <div className="flex flex-col min-w-0">
            <h3
              className={`${isNews ? 'text-[11px] sm:text-[15px] leading-tight' : 'text-[16px] sm:text-[18px]'} font-medium text-gray-900`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
              }}
            >
              {product.name || "Без названия"}
            </h3>

            <div className="flex flex-row items-baseline mt-1">
              <p className={`${isNews ? 'text-[#3E8D43] text-[13px] sm:text-[16px]' : 'text-[#3E8D43] text-[16px] sm:text-[18px]'} font-medium`}>
                {priceStr}
              </p>
              <p className={`${isNews ? 'text-[#A6A6A6] text-[11px]' : 'text-[#A6A6A6] text-[13px]'} font-medium ml-1`}>кг</p>
            </div>
          </div>

          <div className="mt-3 flex justify-end ml-auto">
            {qty === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                disabled={!inStock}
                className="flex items-center justify-center bg-[#3E8D43] w-10 h-10 sm:w-[46px] sm:h-[46px] active:bg-[#3E8D43]/70 transition-all duration-150 rounded-4xl cursor-pointer"
                aria-label="Добавить в корзину"
                type="button"
              >
                <img src={basket} alt="basket" className="w-5 h-5" />
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

        <div className="mt-2"></div>
      </div>
    </div>
  );
}
