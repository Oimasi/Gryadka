import React, { useEffect, useState } from "react";
import success from "/images/success.svg"

export default function SuccessPage({ onNavigate }) {
  return (
    <div className="w-full max-w-[1330px] mx-auto p-6 flex flex-col items-center bg-white">
        <img src={success} className="mb-4 mt-65"/>
        <div className="p-0 text-center text-[20px] rounded-lg w-full mt-0 text-[#888888]">Успешно, заказ находится в обработке</div>
        <button onClick={() => onNavigate("main")} className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] transition-all duration-200 active:bg-[#2EA727] rounded-[10px] mt-5 cursor-pointer bg-[#3E8D43]/17">
            На главную
        </button>
    </div>
  );
}
