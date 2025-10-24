import React, { useEffect, useState } from "react";
import mir from "/images/mir.png"

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [house, setHouse] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const parsed = raw ? JSON.parse(raw) : [];
      setCart(parsed);
    } catch (e) {
      setCart([]);
    }
  }, []);

  const totals = cart.reduce(
    (acc, it) => {
      const price = it.product.price ?? it.product.price_value ?? 0;
      acc.items += it.qty || 0;
      acc.sum += price * (it.qty || 0);
      return acc;
    },
    { items: 0, sum: 0 }
  );

  const delivery = 80;
  const packaging = 60;
  const totalSum = totals.sum + delivery + packaging;

  function placeOrder() {
    if (!name || !phone || !apartment || !entrance || !floor || !house) {
      alert("Заполните все поля для доставки");
      return;
    }
    alert(
      `Заказ оформлен: ${totals.items} шт, сумма ${totalSum} ₽. Спасибо, ${name}!`
    );
    localStorage.removeItem("cart");
    window.dispatchEvent(new CustomEvent("cart:updated"));
    window.location.href = "/";
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-black">Оформление заказа</h1>
        <div className="p-6 bg-white rounded-lg shadow text-gray-600">
          Корзина пуста
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1330px] mx-auto p-6 flex flex-col lg:flex-row gap-6">
      <div className="bg-white border-1 border-gray-200 rounded-[20px] p-6 flex-1">
        <h1 className="text-xl font-semibold mb-4 text-black">Оформление заказа</h1>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-4 mt-3 flex-wrap">
            <div className="flex flex-col w-full sm:w-[48%]">
              <label className="mb-1 text-[16px] text-black">Номер квартиры</label>
              <input
                type="number"
                placeholder="Номер квартиры"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
            </div>

            <div className="flex flex-col w-full sm:w-[48%]">
              <label className="mb-1 text-[16px] text-black">Подъезд</label>
              <input
                type="number"
                placeholder="Подъезд"
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
            </div>

            <div className="flex flex-col w-full sm:w-[48%]">
              <label className="mb-1 text-[16px] text-black">Этаж</label>
              <input
                type="number"
                placeholder="Этаж"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
            </div>

            <div className="flex flex-col w-full sm:w-[48%]">
              <label className="mb-1 text-[16px] text-black">Номер дома</label>
              <input
                type="number"
                placeholder="Номер дома"
                value={house}
                onChange={(e) => setHouse(e.target.value)}
                className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
            </div>

            <label className="flex items-center mt-3 gap-2">
              <input type="checkbox"/>
              Оставить у двери
            </label>
            <label className="flex items-center mt-3 gap-2">
              <input type="checkbox"   />
              Позвонить перед доставкой
            </label>
          </div>
        </div>
      </div>

      <div className="flex w-full h-full ml-0 lg:ml-10 max-h-[413px] lg:max-w-[380px] flex-col gap-4 bg-[#F7F7F7] rounded-[20px] p-6">
          <div className="flex flex-row justify-between w-full">
            <h3 className="text-lg font-semibold mb-4">Оплата</h3>
            <img src={mir} className="w-[68px] h-[20px]"/>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Доставка</span>
            <span>{delivery} ₽</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Упаковка</span>
            <span>{packaging} ₽</span>
          </div>
          <div className="flex justify-between font-semibold text-black text-xl mt-2">
            <span>К оплате</span>
            <span>{totalSum} ₽</span>
          </div>

          <div className="bg-green-100/50 text-green-700 text-center text-sm py-2 rounded mt-4">
            Доставка до двери 30 минут
          </div>

          <button className="mt-0 w-full cursor-pointer hover:bg-black/80 active:bg-black/80 transition-all duration-150 bg-black text-white font-semibold py-3 rounded-lg">
            Оплатить
          </button>
        </div>
    </div>
  );
}
