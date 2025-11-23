import React, { useState, useRef, useEffect } from "react";

export default function ProductDropdown({ product, user, onOpen, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canEdit = user && (user.role === "admin" || user.id === product.owner_id);

  return (
    <div className="relative inline-block" ref={ref}>
        {canEdit && (
            <div>
                <button onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }} className="px-2 py-3 rounded-full cursor-pointer w-[46px] h-[46px] bg-white border-gray-200 hover:bg-gray-200 active:bg-gray-200 transition-all duration-200">
                    ✎
                </button>

                <div onClick={(e) => e.stopPropagation()} className={`absolute bg-white border ml-[-90px] border-gray-100 rounded-xl shadow-lg z-50 transition-all duration-150 ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`} style={{top: open ? "3.5rem" : "0"}}>
                    {canEdit && (
                        <div>
                            <button onClick={() => {
                                setOpen(false);
                                onEdit?.(product);
                            }} className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg">
                                Редактировать
                            </button>

                            <button onClick={() => {
                                setOpen(false);
                                onDelete?.(product);
                            }} className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg">
                                Удалить
                            </button>
                            
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
