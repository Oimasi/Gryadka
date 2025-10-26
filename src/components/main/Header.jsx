import React, { useEffect, useState } from "react";
import logo from "/images/logotype.png"
import marker from "/images/marker.svg"
import search from "/images/search.svg"
import basket from "/images/purchase.svg"
import userw from "/images/user.svg"
import logout from "/images/exit-right.svg"
import ProfileDropdown from "../ui/profiledropdown";

export default function Header({ user, onNavigate, onLogout, query, setQuery, onSearch }) {
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pressedBurger, setPressedBurger] = useState(false)

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
            setAddress(`г. ${city || "неизвестно"}, ул. ${road || "неизвестно"}`);
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="flex-col flex gap-[15px] justify-between max-w-[1330px] bg-white sticky top-0 z-50 my-[8px] mx-auto p-[16px]">
      {pressedBurger && (
        <div
          key="burger-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[2000] w-screen h-screen bg-white flex flex-col gap-6 p-10">
            <button className="text-[#2e7433] py-2 px-4 bg-none border-1 border-[#3E8D43] transition-all duration-150 rounded-xl cursor-pointer active:bg-[#3E8D43] active:text-white hover:text-white hover:bg-[#3E8D43]" 
              onClick={() => {
                onNavigate("main")
                setPressedBurger(false)
              }}>
                Главная
            </button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => {
                onNavigate("categories")
                setPressedBurger(false)
              }}>
                Все категории
            </button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => {
                onNavigate("all")
                setPressedBurger(false)
              }}>
                Все товары
            </button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => {
                onNavigate("faqs")
                setPressedBurger(false)
              }}>
                FAQ
            </button>
        </div>
      )}
      <div className="border-b-1 border-[#CCCCCC] flex flex-row pb-4 justify-between gap-[20px]">
        <img src={logo} className="w-[46px] h-[33px]" alt="Logo" />
        <div className="hidden flex-row md:flex gap-[15px] w-full justify-between">
          <div className="flex flex-col items-center justify-center">
            <img src={marker}/>
          </div>
          <div className="flex flex-col w-full">
            <p className="text-[#A8A8A8] text-[15px] mb-[-4px]">Адрес</p>
            <p className="text-black text-[16px]">{address || "Определяем..."}</p>
          </div>
        </div>

        <div className="hidden md:flex w-full max-w-[560px] gap-2 h-[44px] bg-[#F0F0F0] rounded-[63px] px-[15px] items-center">
          <img src={search} className="w-[19px] h-[19px]"/>
          <input
            className="bg-none w-full max-w-[560px]"
            placeholder="Поиск"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={onSearch}
            aria-label="Поиск"
          />
        </div>

        {user ? (
          <div className="gap-[10px] justify-between flex">
            <button className="w-[46px] h-[46px] items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl cursor-pointer" onClick={() => onNavigate("cart")}>
              <img src={basket} className="flex ml-3"/>
            </button>
            <button className="w-[46px] h-[46px] items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl cursor-pointer" onClick={() => onNavigate("profile")}>
              <img src={userw} className="flex ml-3.5"/>
            </button>
            <button className="w-[46px] h-[46px] items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl cursor-pointer" onClick={onLogout}>
              <img src={logout} className="flex ml-3.5"/>
            </button>
          </div>
        ) : (
          <div className="justify-between flex gap-[9px]">
            <button className="py-2.5 px-5 bg-none border-1 border-[#E9E9E9] rounded-4xl cursor-pointer transition-all duration-150 active:bg-[#F9F9F9] hover:bg-[#F9F9F9]" onClick={() => onNavigate("login")}>Войти</button>
            <button className="py-2.5 px-5 bg-none border-1 border-[#E9E9E9] rounded-4xl cursor-pointer transition-all duration-150 active:bg-[#F9F9F9] hover:bg-[#F9F9F9]" onClick={() => onNavigate("register")}>Регистрация</button>
          </div>
        )}   
      </div>
      
      
        <div className="items-center gap-auto flex justify-between flex-row">
          <div className="md:flex hidden justify-between gap-5">
            <button className="text-[#2e7433] py-2 px-4 bg-none border-1 border-[#3E8D43] transition-all duration-150 rounded-xl cursor-pointer active:bg-[#3E8D43] active:text-white hover:text-white hover:bg-[#3E8D43]" onClick={() => onNavigate("main")}>
              Главная
            </button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => onNavigate("categories")}>Все категории</button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => onNavigate("all")}>Все товары</button>
            <button className="text-black/50 text-[16px] hover:text-black/90 active:text-black/90 transition-all duration-150 cursor-pointer" onClick={() => onNavigate("faqs")}>FAQ</button>
          </div>
          <div className="justify-between flex gap-4">
            {user?.role === "farmer" && (
              <div>
                <ProfileDropdown onNavigate={onNavigate} onLogout={onLogout} />
              </div>
            )}
          </div>
            {isMobile && (
              <div className="flex">
                <button
                  className="flex cursor-pointer ml-auto float-right mr-0 w-10 h-10 text-black items-center justify-center rounded z-[3000]"
                  aria-pressed={pressedBurger}
                  onClick={() => setPressedBurger(!pressedBurger)}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16">
                    <rect
                      y="7"
                      width="16"
                      height="1"
                      rx="1"
                      className={`origin-center transition-all duration-300 ${
                        pressedBurger ? "rotate-45 translate-y-0" : "-translate-y-[5px]"
                      }`}
                    />
                    <rect
                      y="7"
                      width="16"
                      height="1"
                      rx="1"
                      className={`origin-center transition-all duration-300 ${
                        pressedBurger ? "opacity-0" : "opacity-100"
                      }`}
                    />
                    <rect
                      y="7"
                      width="16"
                      height="1"
                      rx="1"
                      className={`origin-center transition-all duration-300 ${
                        pressedBurger ? "-rotate-45 translate-y-[0.1px]" : "translate-y-[5px]"
                      }`}
                    />
                  </svg>
                </button>
              </div>
            )}
        </div>
    </header>
  );
}
