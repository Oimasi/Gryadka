import React, { useEffect, useState } from "react";
import mir from "/images/mir.png"
import { getTotals } from "../../hooks/useCart";
import Dropdown from "../ui/dropdown";
import { Footer } from "./Footer";

export default function CheckoutPage({ onNavigate }) {
  const [cart, setCart] = useState([]);
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [house, setHouse] = useState("");
  const [address, setAddress] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const options = ["Коробка", "Набор на неделю"];
  const [role, setRole] = useState("Коробка"); 
  const [isCardModalOpen, setCardModalOpen] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handleSaveCard = () => {
    setCardModalOpen(false);
    setIsPaying(true);

    setTimeout(() => {
      setIsPaying(false);
      onNavigate("success");
    }, 6000); 
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Геолокация не поддерживается браузером");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();

          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county;
            const road = data.address.road || data.address.neighbourhood || "";
            setAddress(`Г. ${city || "неизвестно"}, ул. ${road || "неизвестно"}`);
          } else {
            setError("Не удалось определить адрес");
          }
        } catch (e) {
          setError("Ошибка при получении адреса");
        }
      },
      (err) => setError("Ошибка получения координат: " + err.message)
    );
  }, []);  

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const parsed = raw ? JSON.parse(raw) : [];
      setCart(parsed);
    } catch (e) {
      setCart([]);
    }
  }, []);

  const delivery = 80;
  const packaging = 60;
  const totals = getTotals(cart);

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
      {isPaying && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[300px] flex flex-col items-center gap-4">
            <div className="loader border-4 mt-3 border-[#3E8D43] border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
            <p className="text-gray-500">Ожидание оплаты...</p>
          </div>
        </div>
      )}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCard() }} className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Введите данные карты</h3>

            <input
              type="text"
              required
              placeholder="Номер карты"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Имя на карте"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
            />
            <div className="flex gap-4">
              <input
                type="text"
                required
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
              />
            </div>

            <div className="flex justify-between mt-4">
              <button onClick={() => setCardModalOpen(false)} type="submit" className="px-4 py-2 rounded-lg border border-gray-400 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200">
                Отмена
              </button>
              <button type="submit" className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left ml-3 cursor-pointer bg-[#3E8D43]/17">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="flex flex-col">
        <div className="bg-[#F7F7F7] rounded-[20px] p-6 mb-4">
           <div className="flex flex-col w-full">
            <p className="text-black text-[16px]">{address || "Определяем..."}</p>
          </div>
        </div>
        <div className="bg-white border-1 mb-4 border-gray-200 rounded-[20px] p-6 flex-1">
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

              <div className="flex flex-col w-full">
                <label className="mb-1 text-[16px] text-black">Комментарий курьеру</label>
                <input
                  placeholder="Напишите свой комментарий"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
                />
              </div>

              <label className="flex cursor-pointer items-center mt-3 gap-2">
                <input type="checkbox"/>
                Оставить у двери
              </label>
              <label className="flex cursor-pointer items-center mt-3 gap-2">
                <input type="checkbox"   />
                Позвонить перед доставкой
              </label>
            </div>

          </div>
        </div>

        <div className="bg-white border-1 border-gray-200 rounded-[20px] p-6 flex-1">
          <h1 className="text-xl font-semibold mb-4 text-black">Детали заказа</h1>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-4 mt-3 flex-wrap">
              <div className="flex flex-col w-full sm:w-[48%]">
                <label className="mb-1 text-[16px] text-black">Номер телефона</label>
                <input
                  type="number"
                  placeholder="Номер телефона"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full h-[48px] rounded-lg border-1 border-gray-300 px-4 py-2.5 text-[15px] text-[#7D7D7D] placeholder-gray-400 focus:border-[#3C7D40] focus:ring-1 focus:ring-[#3C7D40] focus:outline-none"
                />
              </div>

              <div className="flex flex-col w-full max-w-[390px]">
                <label className="mb-2 text-[15px] text-black">Вариант упаковки</label>
                <Dropdown
                  options={options}
                  selected={role === "Коробка" ? "Коробка" : "Набор на неделю"}
                  onSelect={value => setRole(value === "Коробка" ? "Коробка" : "Набор на неделю")}
                />
              </div>
            </div>

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
            <span>{totals.sum.toFixed(0)} ₽</span>
          </div>

          <div className="bg-green-100/50 text-green-700 text-center text-sm py-2 rounded mt-4">
            Доставка до двери 30 минут
          </div>

          <button onClick={() => setCardModalOpen(true)} className="mt-0 w-full cursor-pointer hover:bg-black/80 active:bg-black/80 transition-all duration-150 bg-black text-white font-semibold py-3 rounded-lg">
            Оплатить
          </button>
        </div>
    </div>
  );
}
