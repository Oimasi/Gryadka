import React, { useEffect, useRef, useState } from "react";
import avatar from "/images/avatar.png";
import arrow from "/images/arrow.svg";
import { Footer } from "./Footer";

export default function Profile({ user, onNavigate }) {

  const sliderRef = useRef(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleSendMessage = () => {
    setMessage("");
    setModalOpen(false);
  };

  if (!user) return <div className="form">Пожалуйста, войдите.</div>;
  return (
    <div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-60 flex justify-center items-center z-50">
          <form className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-left">Написать в поддержку</h2>
            <textarea required className="w-full h-[120px] p-3 border-gray-300 transition-all duration-200 border-1 rounded-lg focus:border-[#3E8D43]" placeholder="Введите ваше сообщение" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex justify-between items-end mt-4">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-400 float-left mr-auto hover:bg-gray-100 cursor-pointer active:bg-gray-100 transition-all duration-200">
                Отмена
              </button>
              <button type="submit" onClick={handleSendMessage} className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-left ml-3 cursor-pointer bg-[#3E8D43]/17">
                Отправить
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="flex-col flex gap-[15px] justify-between max-w-[1330px] my-[8px] mx-auto p-[16px]">
        <h3><span className="text-[#A8A8A8] cursor-pointer" onClick={() => onNavigate("main")}>Главная ·</span> Профиль</h3>
        <div className="flex flex-col justify-center items-center md:items-start md:text-left text-center md:justify-between w-full md:flex-row mt-6">
          <div className="flex flex-col md:flex-row">
            <div className="flex w-full items-center justify-center mb-10 md:mb-0">
              <img src={avatar} className="w-[170px] h-[170px]"/>
            </div>
            <div className="flex flex-col ml-0 md:ml-13">
              <div className="mb-2">
                <div className="text-[26px] font-semibold">{user.first_name || ""} {user.last_name || ""}</div>
              </div>
              <div className="justify-between flex gap-1 flex-col">
                <a className="text-[17px] text-[#999999]">ID аккаунта:⠀<span className="text-black">{user.id}</span></a>
                <a className="text-[17px] text-[#999999]">Email:⠀<span className="text-black">{user.email}</span></a>
                <a className="text-[17px] text-[#999999]">Тип аккаунта:⠀<span className="text-black">{user.role === "farmer" ? "Фермер" : "Покупатель"}</span></a>
              </div>
            </div>         
          </div>
          <div className="mt-16 md:mt-0">
            <div>
              <button onClick={() => setModalOpen(true)} className="py-2.5 px-4 text-[#3E8D43] hover:text-[#ffffff] active:text-[#ffffff] font-medium hover:bg-[#3E8D43] transition-all duration-200 active:bg-[#2EA727] rounded-[10px] float-right ml-auto cursor-pointer bg-[#3E8D43]/17">
                Обратиться в поддержку
              </button>
            </div>
          </div>
        </div>
        <section className="mt-10">
          <div className="flex flex-row">
            <a className="text-[20px] text-black transition-all duration-150 font-medium">История покупок</a>
            <img src={arrow} className="mt-2.5 ml-1.5 mb-6 w-[17px] h-[12px]"/>
          </div>
          <div className="relative max-w-[1330px] mx-auto flex items-center flex-row">
            <p className="text-black/50 text-[16px]">Покупок в этом месяце не было</p>
          </div>
        </section>  
      </div>
      <div className="mt-69 max-w-[1300px] justify-center items-center mx-auto"> 
        <Footer />
      </div>
    </div>
  );
}
