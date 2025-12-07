import React, { useEffect, useRef, useState } from "react";
import avatar from "/images/avatar.png";
import arrow from "/images/arrow.svg";
import { Footer } from "./Footer";
import { getBalance, topUpBalance, getUserStats } from "../../api";

// Иконки достижений
const ACHIEVEMENT_ICONS = {
  seedling: "🌱",
  tree: "🌳",
  forest: "🌲",
  sparkle: "✨",
  fire: "🔥",
  rocket: "🚀",
  coin: "🪙",
  diamond: "💎"
};

export default function Profile({ user, onNavigate }) {
  const sliderRef = useRef(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  
  // Кошелёк
  const [balance, setBalance] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [topUpLoading, setTopUpLoading] = useState(false);
  
  // Геймификация
  const [stats, setStats] = useState(null);
  const [level, setLevel] = useState(null);
  const [achievements, setAchievements] = useState([]);

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

  // Загрузка данных
  useEffect(() => {
    if (user) {
      // Загружаем статистику
      getUserStats().then(res => {
        if (res.ok) {
          setStats(res.data.stats);
          setLevel(res.data.level);
          setAchievements(res.data.achievements || []);
          setBalance(res.data.stats?.balance || 0);
        }
      });
    }
  }, [user]);

  const handleSendMessage = () => {
    setMessage("");
    setModalOpen(false);
  };

  const handleTopUp = async () => {
    if (topUpAmount <= 0) return;
    setTopUpLoading(true);
    const res = await topUpBalance(topUpAmount);
    setTopUpLoading(false);
    if (res.ok) {
      setBalance(res.data.balance);
      setStats(prev => prev ? { ...prev, balance: res.data.balance } : null);
      setShowTopUp(false);
    }
  };

  const presets = [100, 300, 500, 1000, 2000, 5000];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (!user) return <div className="form">Пожалуйста, войдите.</div>;
  
  return (
    <div>
      {/* Модалка поддержки */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-60 flex justify-center items-center z-50">
          <form className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-left">Написать в поддержку</h2>
            <textarea required className="w-full h-[120px] p-3 border-gray-300 transition-all duration-200 border-1 rounded-lg focus:border-[#3E8D43]" placeholder="Введите ваше сообщение" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex justify-between items-end mt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-400 hover:bg-gray-100 cursor-pointer transition-all duration-200">
                Отмена
              </button>
              <button type="submit" onClick={handleSendMessage} className="py-2.5 px-4 text-[#3E8D43] hover:text-white font-medium hover:bg-[#3E8D43] transition-all duration-200 rounded-[10px] cursor-pointer bg-[#3E8D43]/17">
                Отправить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Модалка пополнения */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={() => setShowTopUp(false)}>
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">Пополнить баланс</h2>
              <button onClick={() => setShowTopUp(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-sm text-gray-500 mb-2">Сумма пополнения</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setTopUpAmount(p)}
                  className={`py-2 rounded-[10px] text-sm font-medium transition-colors ${
                    topUpAmount === p 
                      ? 'bg-[#3E8D43] text-white' 
                      : 'bg-[#F7F7F7] text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p} ₽
                </button>
              ))}
            </div>
            
            <div className="border border-gray-200 rounded-[14px] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Данные карты</span>
                <div className="flex gap-1">
                  <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-800 rounded-[3px]"></div>
                  <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded-[3px]"></div>
                  <div className="w-8 h-5 bg-gradient-to-r from-green-500 to-green-700 rounded-[3px]"></div>
                </div>
              </div>
              <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] mb-3 focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono tracking-wider" />
              <div className="flex gap-3">
                <input type="text" placeholder="ММ/ГГ" maxLength={5} className="flex-1 px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono" />
                <input type="text" placeholder="CVV" maxLength={3} className="w-24 px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono" />
              </div>
            </div>
            
            <div className="bg-[#F7F7F7] rounded-[10px] p-3 mb-4 flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500">Демо-режим. Данные карты не сохраняются.</p>
            </div>
            
            <button onClick={handleTopUp} disabled={topUpLoading || topUpAmount <= 0} className="w-full py-3 bg-[#3E8D43] text-white rounded-[12px] font-semibold hover:bg-[#357a3a] transition-colors disabled:opacity-50">
              {topUpLoading ? "Обработка..." : `Оплатить ${topUpAmount} ₽`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">Защищено SSL-шифрованием</p>
          </div>
        </div>
      )}

      <div className="flex-col flex gap-[15px] justify-between max-w-[1330px] my-[8px] mx-auto p-[16px]">
        <h3><span className="text-[#A8A8A8] cursor-pointer" onClick={() => onNavigate("main")}>Главная ·</span> Профиль</h3>
        
        {/* Основная инфа + уровень */}
        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* Левая часть - аватар и инфо */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 flex-1">
            <img src={avatar} className="w-[140px] h-[140px]"/>
            <div className="text-center md:text-left">
              <div className="text-[26px] font-semibold">{user.first_name || ""} {user.last_name || ""}</div>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[15px] text-gray-500">ID: <span className="text-black">{user.id}</span></span>
                <span className="text-[15px] text-gray-500">Email: <span className="text-black">{user.email}</span></span>
                <span className="text-[15px] text-gray-500">Тип: <span className="text-black">{user.role === "farmer" ? "Фермер" : "Покупатель"}</span></span>
              </div>
              <button onClick={() => setModalOpen(true)} className="mt-4 py-2 px-4 text-[#3E8D43] font-medium hover:bg-[#3E8D43] hover:text-white transition-all rounded-[10px] bg-[#3E8D43]/10">
                Поддержка
              </button>
            </div>
          </div>
          
          {/* Правая часть - уровень */}
          {level && (
            <div className="bg-gradient-to-br from-[#3E8D43] to-[#2d6b31] rounded-[20px] p-5 text-white min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/70 text-sm">Ваш уровень</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">LVL {level.level}</span>
              </div>
              <div className="text-2xl font-bold mb-1">{level.name}</div>
              <div className="text-white/70 text-sm mb-3">{level.xp} / {level.xp_for_next} XP</div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${level.progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Статистика */}
        {stats && (
          <section className="mt-8">
            <div className="text-[20px] font-medium mb-4">Статистика</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#F7F7F7] rounded-[16px] p-4 text-center">
                <div className="text-3xl font-bold text-[#3E8D43]">{stats.adoptions}</div>
                <div className="text-sm text-gray-500 mt-1">Опекунств</div>
              </div>
              <div className="bg-[#F7F7F7] rounded-[16px] p-4 text-center">
                <div className="text-3xl font-bold text-[#3E8D43]">{stats.boosts}</div>
                <div className="text-sm text-gray-500 mt-1">Бустов</div>
              </div>
              <div className="bg-[#F7F7F7] rounded-[16px] p-4 text-center">
                <div className="text-3xl font-bold text-[#3E8D43]">{stats.total_spent}₽</div>
                <div className="text-sm text-gray-500 mt-1">Потрачено</div>
              </div>
              <div className="bg-[#F7F7F7] rounded-[16px] p-4 text-center">
                <div className="text-3xl font-bold text-[#3E8D43]">{unlockedCount}/{achievements.length}</div>
                <div className="text-sm text-gray-500 mt-1">Достижений</div>
              </div>
            </div>
          </section>
        )}

        {/* Кошелёк */}
        <section className="mt-8">
          <div className="text-[20px] font-medium mb-4">Кошелёк</div>
          <div className="bg-[#F7F7F7] rounded-[16px] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Баланс</div>
                <div className="text-3xl font-bold">{balance} ₽</div>
              </div>
              <button onClick={() => setShowTopUp(true)} className="py-2.5 px-5 bg-[#3E8D43] text-white rounded-[10px] font-medium hover:bg-[#357a3a] transition-colors">
                Пополнить
              </button>
            </div>
          </div>
        </section>

        {/* Достижения */}
        {achievements.length > 0 && (
          <section className="mt-8">
            <div className="text-[20px] font-medium mb-4">Достижения</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {achievements.map(ach => (
                <div 
                  key={ach.id} 
                  className={`rounded-[16px] p-4 border-2 transition-all ${
                    ach.unlocked 
                      ? 'bg-[#3E8D43]/5 border-[#3E8D43]/30' 
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${ach.unlocked ? '' : 'grayscale'}`}>
                      {ACHIEVEMENT_ICONS[ach.icon] || "🏆"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${ach.unlocked ? 'text-[#3E8D43]' : 'text-gray-500'}`}>
                        {ach.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{ach.description}</div>
                      <div className="text-xs text-[#3E8D43] mt-1">+{ach.xp} XP</div>
                    </div>
                    {ach.unlocked && (
                      <svg className="w-5 h-5 text-[#3E8D43]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-row">
            <a className="text-[20px] text-black font-medium">История покупок</a>
            <img src={arrow} className="mt-2.5 ml-1.5 w-[17px] h-[12px]"/>
          </div>
          <div className="mt-4">
            <p className="text-gray-500">Покупок в этом месяце не было</p>
          </div>
        </section>  
      </div>
      
      <div className="mt-20 max-w-[1300px] px-5 lg:px-0 mx-auto"> 
        <Footer />
      </div>
    </div>
  );
}
