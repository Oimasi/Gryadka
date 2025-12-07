import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();

  const sliderRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const mouseDown = (e) => {
      isDown = true;
      slider.classList.add("active");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const mouseUpOrLeave = () => {
      isDown = false;
      slider.classList.remove("active");
    };

    const mouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1;
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUpOrLeave);
    window.addEventListener("mousemove", mouseMove);

    return () => {
      slider.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUpOrLeave);
      window.removeEventListener("mousemove", mouseMove);
    };
  }, []);  

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const DEFAULT_ADDRESS = "г. Москва";

    const setAddressSafe = (value) => {
      if (cancelled) return;
      resolved = true;
      setAddress(value);
      setError(null);
    };

    const setErrorSafe = (value) => {
      if (cancelled) return;
      resolved = true;
      // Вместо ошибки всегда показываем запасной адрес
      setAddress(DEFAULT_ADDRESS);
      setError(value);
    };

    const fallbackByIp = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data?.city || data?.region) {
          const city = data.city || data.region;
          const area = data.region || data.country_name || "";
          setAddressSafe(`г. ${city}, ${area}`);
        } else {
          setAddressSafe(DEFAULT_ADDRESS);
        }
      } catch (err) {
        setAddressSafe(DEFAULT_ADDRESS);
      }
    };

    const reverseGeocode = async (latitude, longitude) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        if (data?.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.county;
          const road = data.address.road || data.address.neighbourhood || data.address.suburb || "";
          setAddressSafe(`г. ${city || "неизвестно"}, ул. ${road || "неизвестно"}`);
        } else {
          setAddressSafe(DEFAULT_ADDRESS);
          fallbackByIp();
        }
      } catch (e) {
        setAddressSafe(DEFAULT_ADDRESS);
        fallbackByIp();
      }
    };

    if (!navigator.geolocation) {
      setAddressSafe(DEFAULT_ADDRESS);
      fallbackByIp();
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        reverseGeocode(latitude, longitude);
      },
      (err) => {
        setErrorSafe("Ошибка получения координат: " + err.message);
        fallbackByIp();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    const timeoutId = setTimeout(() => {
      if (!cancelled && !resolved) {
        fallbackByIp();
      }
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="flex-col flex gap-[15px] justify-between max-w-[1330px] bg-white sticky top-0 z-50 my-[8px] mx-auto p-[16px]">
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
            className="bg-none w-full max-w-[560px] outline-none"
            placeholder="Поиск"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={onSearch}
            aria-label="Поиск"
          />
        </div>

        {user ? (
          <div className="gap-[10px] justify-between flex">
            <Link to="/cart" className="w-[46px] h-[46px] flex items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl">
              <img src={basket} className="flex"/>
            </Link>
            <Link to="/profile" className="w-[46px] h-[46px] flex items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl">
              <img src={userw} className="flex"/>
            </Link>
            <button className="w-[46px] h-[46px] items-center justify-center bg-none active:bg-[#F9F9F9] transition-all duration-150 hover:bg-[#F9F9F9] border-1 border-[#E9E9E9] rounded-4xl cursor-pointer" onClick={onLogout}>
              <img src={logout} className="flex ml-3.5"/>
            </button>
          </div>
        ) : (
          <div className="justify-between flex gap-[9px]">
            <Link to="/login" className="py-2.5 px-5 bg-none border-1 border-[#E9E9E9] rounded-4xl transition-all duration-150 active:bg-[#F9F9F9] hover:bg-[#F9F9F9]">Войти</Link>
            <Link to="/register" className="py-2.5 px-5 bg-none border-1 border-[#E9E9E9] rounded-4xl transition-all duration-150 active:bg-[#F9F9F9] hover:bg-[#F9F9F9]">Регистрация</Link>
          </div>
        )}   
      </div>
        <div className="relative">
          <div
            ref={sliderRef}
            className="overflow-x-auto scrollbar-hide flex flex-row gap-5 items-center whitespace-nowrap"
          >
            <Link 
              to="/" 
              className={`py-2 px-4 border-1 transition-all duration-150 rounded-xl flex items-center justify-center shrink-0 ${
                isActive("/") && location.pathname === "/" 
                  ? "bg-[#3E8D43] text-white border-[#3E8D43]" 
                  : "text-[#2e7433] border-[#3E8D43] hover:bg-[#3E8D43] hover:text-white active:bg-[#3E8D43] active:text-white"
              }`}
            >
              Главная
            </Link>
            <Link 
              to="/categories" 
              className={`text-[16px] transition-all duration-150 ${
                isActive("/categories") 
                  ? "text-black/90" 
                  : "text-black/50 hover:text-black/90 active:text-black/90"
              }`}
            >
              Все категории
            </Link>
            <Link 
              to="/products" 
              className={`text-[16px] transition-all duration-150 ${
                isActive("/products") 
                  ? "text-black/90" 
                  : "text-black/50 hover:text-black/90 active:text-black/90"
              }`}
            >
              Все товары
            </Link>
            <Link 
              to="/faqs" 
              className={`text-[16px] transition-all duration-150 ${
                isActive("/faqs") 
                  ? "text-black/90" 
                  : "text-black/50 hover:text-black/90 active:text-black/90"
              }`}
            >
              FAQ
            </Link>
            {user && (
              <Link 
                to="/my-plants" 
                className={`text-[16px] transition-all duration-150 ${
                  isActive("/my-plants") 
                    ? "text-black/90" 
                    : "text-black/50 hover:text-black/90 active:text-black/90"
                }`}
              >
                Мои растения
              </Link>
            )}
          </div>

          {user?.role === "farmer" && (
            <div className="hidden md:absolute md:flex right-0 top-0">
              <ProfileDropdown onNavigate={onNavigate} onLogout={onLogout} />
            </div>
          )}
        </div>
    </header>
  );
}
