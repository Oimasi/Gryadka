import React, { useState, useRef, useEffect } from "react";

export default function Dropdown({ options, selected, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

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
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex justify-between items-center w-full h-[48px] px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
        {selected || label}
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
        <ul className="absolute left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
          {options.map((option, i) => (
            <li key={i} onClick={() => {
                onSelect(option);
                setOpen(false);
              }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
