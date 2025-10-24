import React, { useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import { getProducts, getMyProducts } from "../../api";
import bg from "/images/bg.png" 
import { Footer } from "./Footer";
import arrow from "/images/arrow.svg";
import image1 from "/images/image1.png";
import image2 from "/images/image2.png";
import image3 from "/images/image3.png";
import image4 from "/images/image4.png";
import image5 from "/images/image5.png";
import image6 from "/images/image6.png";
import berries from "/images/berries.png";
import item1 from "/images/item1.png";
import item2 from "/images/item1-1.png";
import item3 from "/images/item1-2.png";
import item4 from "/images/item1-3.png";
import item5 from "/images/item1-4.png";
import ProfileDropdown from "../ui/profiledropdown";

export default function MainPage({ q, user, onOpen, onEdit, onNavigate, onDelete, my=false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const sliderRef1 = useRef(null);
  const sliderRef2 = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const r = my ? await getMyProducts() : await getProducts({ q });
      if (r.ok) setList(r.data || []);
      else setList([]);
    } catch (e) { setList([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [q]);

  function initDragScroll(sliderRef) {
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
  }

  useEffect(() => {
    const cleanup1 = initDragScroll(sliderRef1);
    const cleanup2 = initDragScroll(sliderRef2);
    return () => {
      cleanup1 && cleanup1();
      cleanup2 && cleanup2();
    };
  }, []);

  return (
    <div className="max-w-[1330px] my-[8px] mx-auto p-[16px]">
      <div className="bg-[#3E8D43] flex flex-row h-full min-h-[350px] rounded-[20px] px-[40px] py-[30px] justify-between gap-auto">
        <div className="flex flex-col justify-between gap-auto">
            <div className="flex">
                <p className="text-white/40">Новости</p>
            </div>
            <div className="flex flex-col gap-3 mt-20 md:mt-0">
                <p className="font-semibold text-[25px] md:text-[30px] leading-9 text-white">Отслеживайте свежесть <br/> продукции в режиме реального времени</p>
                <p className="text-[20px] text-white/70">Всё свежее, сезонное и честное —<br/> напрямую от производителя к вам домой.</p>
            </div>
        </div>
        <div className="hidden lg:flex">
            <img src={bg} className="w-[400px] h-[297px]"/>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-row cursor-pointer">
          <a className="text-[20px] text-black hover:text-[#3E8D43] transition-all duration-150 active:text-[#3E8D43] font-medium" onClick={() => onNavigate("categories")}>Категории</a>
          <img src={arrow} className="mt-2.5 ml-1.5 mb-6 w-[17px] h-[12px]"/>
        </div>
        <div className="relative max-w-[1330px] mx-auto">
          <div
            ref={sliderRef1}
            className="flex gap-4 py-2 overflow-x-scroll select-none cursor-grab scrollbar-hide">
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Овощи</a>
              <div className="select-none pointer-events-none">
                <img src={image2} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-12"/>
              </div>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Зелень и травы</a>
              <div className="select-none pointer-events-none">
                <img src={image1} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-13"/>
              </div>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Фрукты</a>
              <div className="select-none pointer-events-none">
                <img src={image3} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-12.5"/>
              </div>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Ягоды</a>
              <div className="select-none pointer-events-none">
                <img src={berries} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-8"/>
              </div>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Грибы</a>
              <div className="select-none pointer-events-none">
                <img src={image4} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[83px]"/>
              </div>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Зерновые и<br/> бобовые</a>
              <div className="select-none pointer-events-none">
                <img src={image5} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[60px]"/>
              </div>
            </div>
             <div className="flex-shrink-0 flex-col w-[311px] h-[217px] bg-[#ffffff] transition-all duration-150 rounded-[20px] flex text-left p-[27px] border-1 border-[#e7e7e7]">
              <a className="font-medium text-[18px] text-black leading-6">Орехи и семена</a>
              <div className="select-none pointer-events-none">
                <img src={image6} className="select-none pointer-events-none w-[169.28px] ml-[-10px] mt-[77px]"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-row">
          <a className="text-[20px] text-black transition-all duration-150 font-medium">Фермы рядом</a>
          <img src={arrow} className="mt-2.5 ml-1.5 mb-6 w-[17px] h-[12px]"/>
        </div>
        <div className="relative max-w-[1330px] mx-auto">
          <div
            ref={sliderRef2}
            className="flex gap-4 py-2 overflow-x-scroll select-none cursor-grab scrollbar-hide">
            <div className="flex-shrink-0 flex-col w-[311px] h-[100px]">
              <img src={item1} className="select-none pointer-events-none"/>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[100px]">
              <img src={item2} className="select-none pointer-events-none"/>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[100px]">
              <img src={item3} className="select-none pointer-events-none"/>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[100px]">
              <img src={item4} className="select-none pointer-events-none"/>
            </div>
            <div className="flex-shrink-0 flex-col w-[311px] h-[100px]">
              <img src={item5} className="select-none pointer-events-none"/>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mt-13">
        <div className="flex flex-row cursor-pointer" onClick={() => onNavigate("all")}>
          <a className="text-[20px] text-black hover:text-[#3E8D43] transition-all duration-150 active:text-[#3E8D43] font-medium">Все товары</a>
          <img src={arrow} className="mt-2.5 ml-1.5 mb-6 w-[17px] h-[12px]"/>
        </div>
        <div className="max-w-[1330px] mx-auto">
          {loading ? <div className="mt-6">Загрузка...</div> : list.length === 0 ? <div className="mt-6">Пусто</div> : (
            <div id="products" className="mt-6 space-y-4">
              {list.map(p => (
                <ProductCard key={p.id} product={p} user={user} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} onAddToCart={(prod, qty) => {
                  try {
                    const raw = localStorage.getItem("cart");
                    const cart = raw ? JSON.parse(raw) : [];

                    const idx = cart.findIndex(c => c.product.id === prod.id);
                    if (idx >= 0) cart[idx].qty = Math.min((cart[idx].qty || 0) + qty, prod.stock || 9999);

                    else cart.push({ product: prod, qty });
                    localStorage.setItem("cart", JSON.stringify(cart));
                    window.dispatchEvent(new CustomEvent("cart:updated"));
                    
                  } catch (err) { }
                }} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
