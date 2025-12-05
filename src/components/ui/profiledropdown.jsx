import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export default function ProfileDropdown({ onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center py-2 px-4 bg-none border-1 border-[#E9E9E9] rounded-xl cursor-pointer active:bg-[#F9F9F9] hover:bg-[#F9F9F9]" onClick={() => setOpen(!open)}>
        Панель фермера
        <svg
          className="ml-2 h-4 w-4 transform transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg z-20">
            <Link to="/my" className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
              Мои товары
            </Link>
            <Link to="/create-product" className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
              Создать товар
            </Link>
            <Link to="/create-farm" className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
              Создать ферму
            </Link>
            <Link to="/create-sensor" className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => setOpen(false)}>
              Создать датчик
            </Link>
          </div>
        )}
    </div>
  );
}
