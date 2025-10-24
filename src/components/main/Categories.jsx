import React from "react";
import image1 from "/images/image1.png";
import image2 from "/images/image2.png";
import image3 from "/images/image3.png";
import image4 from "/images/image4.png";
import image5 from "/images/image5.png";
import image6 from "/images/image6.png";
import berries from "/images/berries.png";

export default function Categories({ onSelectCategory }) {
  const handleClick = (name) => {
    if (onSelectCategory) onSelectCategory(name);
  };

  return (
    <div className="bg-white flex flex-col gap-4 max-w-[1330px] my-4 mx-auto px-4">
      <h2 className="text-xl font-semibold text-black">Все категории</h2>
      <section className="mt-5">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          <div onClick={() => handleClick("Овощи")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Овощи</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image2} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-12" />
            </div>
          </div>

          <div onClick={() => handleClick("Зелень и травы")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Зелень и травы</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image1} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-13" />
            </div>
          </div>

          <div onClick={() => handleClick("Фрукты")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Фрукты</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image3} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-12.5" />
            </div>
          </div>

          <div onClick={() => handleClick("Ягоды")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Ягоды</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={berries} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-8" />
            </div>
          </div>

          <div onClick={() => handleClick("Грибы")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Грибы</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image4} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[83px]" />
            </div>
          </div>

          <div onClick={() => handleClick("Зерновые и бобовые")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Зерновые и<br/>бобовые</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image5} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[60px]" />
            </div>
          </div>

          <div onClick={() => handleClick("Орехи и семена")} className="w-full h-[217px] bg-white rounded-[20px] flex flex-col justify-between text-left p-[27px] border border-[#e7e7e7] transition-all duration-150 active:bg-[#f5f5f5]/60 hover:bg-[#f5f5f5]/60 cursor-pointer">
            <a className="font-medium text-[18px] text-black leading-6">Орехи и семена</a>
            <div className="select-none pointer-events-none flex justify-start">
              <img src={image6} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[77px]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
