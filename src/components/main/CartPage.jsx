import React, { useEffect, useState } from "react";
import { getCart, subscribe, updateQty, removeItem, clearCart, getTotals } from "../../hooks/useCart";
import { Footer } from "./Footer";

export default function CartPage({ cartItems: propsCart, onCheckout, onNavigate }) {
  const [cart, setCart] = useState(propsCart && Array.isArray(propsCart) ? propsCart : getCart());

  useEffect(() => {
    if (propsCart && Array.isArray(propsCart)) setCart(propsCart);
    else setCart(getCart());

    const unsub = subscribe((c) => {
      setCart(c);
    });
    return () => unsub();
  }, [propsCart]);

  function changeQtyByProduct(productId, qty) {
    updateQty(productId, qty);
    setCart(getCart());
  }

  function removeByProduct(productId) {
    removeItem(productId);
    setCart(getCart());
  }

  function handleClear() {
    clearCart();
    setCart([]);
  }

  const totals = getTotals(cart);

  function handleCheckout() {
    if (cart.length === 0) {
      alert("Корзина пуста");
      return;
    }
    if (onCheckout) {
      onCheckout(cart);
    } else if (onNavigate) {
      onNavigate("checkout");
    } else {
      window.location.href = "/checkout";
    }
  }

  return (
    <div className="bg-white flex flex-col gap-4 max-w-[1330px] h-full my-4 mx-auto px-4">
      <div className="flex flex-row justify-between gap-auto">
         <h2 className="text-xl font-semibold text-black">Корзина <span className="text-gray-400/80 leading-0 ">{totals.items}</span></h2>
         <button onClick={handleClear} className="text-gray-400/80 cursor-pointer hover:text-black active:text-black transition-all duration-150">Очистить</button>
      </div>
      {cart.length === 0 ? (
        <div className="p-0 text-center text-[25px] rounded-lg w-full mt-12 text-black/40">Упс, корзина пуста {'(>_<)'}</div>
      ) : (
        <div className=" flex mr-5 flex-col lg:flex-row gap-4 w-full h-full">
          <div className="bg-white rounded-lg w-full">
            {cart.map((it, idx) => {
              const price = Number(it.product.price ?? it.product.price_value ?? 0) || 0;
              return (
                <div key={it.product.id || idx} className="flex flex-col sm:flex-row items-center sm:items-start gap-4 py-4 w-full">
                  <div className="flex flex-row w-full">
                    <div className="flex flex-row">
                      <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img 
                          src={(it.product.media?.[0]?.presigned_url) || ""} 
                          alt="нет фото" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex ml-6 mt-[0px] justify-right w-full flex-col">
                      <div className="mb-4 flex flex-row w-full justify-between items-center">
                        <div className="min-w-0">
                          <div className="font-medium text-black">{it.product.name}</div>
                          <div className="text-sm text-gray-500 truncate">{it.product.category || ""}</div>
                        </div>

                        <div className="text-right font-bold text-lg">
                          {price} ₽
                          <div className="text-sm text-gray-500">кг</div>
                        </div>
                      </div>
                      <div className="flex flex-row w-full justify-between gap-auto">
                        <div className="flex justify-between w-full flex-row items-center mt-0">
                          <div className="flex items-center gap-0 bg-gray-100 py-2 px-2 rounded-4xl">
                            <button 
                              onClick={() => changeQtyByProduct(it.product.id, (it.qty || 1) - 1)} 
                              className="cursor-pointer text-[18px] text-white px-3.5 py-1 rounded-4xl bg-[#3E8D43]"
                            >-</button>
                            <input 
                              type="number" 
                              value={it.qty || 1} 
                              min={1} 
                              onChange={(e) => changeQtyByProduct(it.product.id, Math.max(1, parseInt(e.target.value || "1", 10)))} 
                              className="w-12 text-center text-[17px] rounded px-2 py-1"
                            />
                            <button 
                              onClick={() => changeQtyByProduct(it.product.id, (it.qty || 1) + 1)} 
                              className="cursor-pointer text-[18px] text-white px-3 py-1 rounded-4xl bg-[#3E8D43]"
                            >+</button>
                          </div>
                          <div>
                            <button 
                              onClick={() => removeByProduct(it.product.id)} 
                              className="w-full text-red-600 text-sm ml-4 cursor-pointer"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex w-full h-full ml-0 lg:ml-10 max-h-[413px] lg:max-w-[380px] flex-col gap-4 bg-[#F7F7F7] rounded-[20px] p-6">
            <h3 className="text-lg font-semibold mb-4">Оформление заказа</h3>

            <div className="flex justify-between text-gray-500">
              <span>Товары</span>
              <span>{totals.sum.toFixed(0)} ₽</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Доставка</span>
              <span>{totals.delivery ?? 80} ₽</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Упаковка</span>
              <span>{totals.packaging ?? 60} ₽</span>
            </div>
            <div className="flex justify-between font-semibold text-black text-xl mt-2">
              <span>К оплате</span>
              <span>{totals.sum.toFixed(0)} ₽</span>
            </div>

            <div className="bg-green-100/50 text-green-700 text-center text-sm py-2 rounded mt-4">
              Доставка до двери 30 минут
            </div>

            <button 
              onClick={handleCheckout} 
              className="mt-0 w-full cursor-pointer hover:bg-black/80 active:bg-black/80 transition-all duration-150 bg-black text-white font-semibold py-3 rounded-lg"
            >
              Оформить заказ
            </button>
          </div>

        </div>
      )}
      <div className="mt-40 w-full">
        <Footer />
      </div>
    </div>
  );
}
