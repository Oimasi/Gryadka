import React, { useEffect, useState } from "react";
import { getMyAdoptions, getBalance, topUpBalance, fetchImageAsObjectURL, deleteAdoption, updateAdoptionNickname, getUserStats, getCommunityGoals } from "../../api";
import { Footer } from "./Footer";
import PlantBoostShop from "./PlantBoostShop";

// Прогресс-бар роста с фазами
function GrowthProgressBar({ percent, daysGrowing }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const phase = clampedPercent < 25 ? "Посев" : clampedPercent < 50 ? "Рост" : clampedPercent < 75 ? "Созревание" : "Сбор скоро!";
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs mb-1.5">
        <span className="text-gray-500">День {daysGrowing}</span>
        <span className={`font-medium ${clampedPercent >= 75 ? 'text-[#3E8D43]' : 'text-gray-600'}`}>{phase}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#86efac] via-[#22c55e] to-[#15803d]"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

// Карточка растения (улучшенная)
function PlantCard({ adoption, onOpenShop, onDelete, onUpdateNickname, onNavigate, index }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(adoption.nickname || "");
  const isHalal = Boolean(adoption.is_halal);
  const isLenten = Boolean(adoption.is_lenten);
  
  useEffect(() => {
    if (adoption.primary_image_url) {
      fetchImageAsObjectURL(adoption.primary_image_url).then(setImgSrc);
    }
  }, [adoption.primary_image_url]);
  
  const handleSaveNickname = async () => {
    await onUpdateNickname(adoption.id, nickname);
    setEditing(false);
  };
  
  const daysAdopted = Math.floor((Date.now() - new Date(adoption.adopted_at).getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <div 
      className="bg-white rounded-[20px] border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Изображение */}
      <div 
        className="h-44 bg-gradient-to-br from-gray-50 to-gray-100 relative cursor-pointer overflow-hidden"
        onClick={() => onNavigate(`product/${adoption.product_id}`)}
      >
        {imgSrc ? (
          <img src={imgSrc} alt={adoption.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
            Растение
          </div>
        )}
        
        {/* Убрали проценты роста и дублирующий бейдж здоровья */}
        
        {/* Дней под опекой */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
          {daysAdopted} дн. под опекой
        </div>
      </div>
      
      {/* Контент */}
      <div className="p-4">
        {/* Никнейм */}
        <div className="mb-3">
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Имя растения..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E8D43]/30"
                maxLength={50}
                autoFocus
              />
              <button 
                onClick={handleSaveNickname}
                className="px-4 py-2 bg-[#3E8D43] text-white rounded-xl text-sm hover:bg-[#357a3a] transition-colors"
              >
                ✓
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                  {adoption.nickname || adoption.product_name}
                </h3>
                {adoption.nickname && (
                  <p className="text-sm text-gray-400 mt-0.5">{adoption.product_name}</p>
                )}
                {(isHalal || isLenten) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isHalal && <span className="inline-block bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[12px] font-medium">Халяль</span>}
                    {isLenten && <span className="inline-block bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[12px] font-medium">Постное</span>}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-300 hover:text-[#3E8D43] hover:bg-[#3E8D43]/10 rounded-lg transition-colors"
                title="Дать имя"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Инфо */}
        <div className="text-sm text-gray-500 mb-4">
          {adoption.farm_name || "Ферма"}
        </div>
        
        {/* Прогресс-бар */}
        <div className="mb-4">
          <GrowthProgressBar 
            percent={adoption.growth_percent} 
            daysGrowing={adoption.days_growing}
          />
        </div>

        {adoption.health_score != null && (
          <div className="mb-4 text-xs text-gray-600 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full ${adoption.health_score >= 80 ? "bg-green-50 text-green-700" : adoption.health_score >= 60 ? "bg-emerald-50 text-emerald-700" : adoption.health_score >= 40 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
              Здоровье {adoption.health_score}% {adoption.health_status ? `· ${adoption.health_status}` : ""}
            </span>
            {adoption.health_tip && <span className="text-[11px] text-gray-500 truncate">{adoption.health_tip}</span>}
          </div>
        )}
        
        {/* Кнопки */}
        <div className="flex gap-2">
          <button
            onClick={() => onOpenShop(adoption)}
            className="flex-1 py-2.5 bg-[#3E8D43] text-white rounded-xl font-medium hover:bg-[#357a3a] transition-colors"
          >
            Бусты
          </button>
          <button
            onClick={() => onDelete(adoption.id)}
            className="px-3 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Отписаться"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Модалка пополнения
function TopUpModal({ isOpen, onClose, onTopUp, currentBalance }) {
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);
  const presets = [100, 300, 500, 1000, 2000, 5000];
  
  const handleTopUp = async () => {
    if (amount <= 0) return;
    setLoading(true);
    await onTopUp(amount);
    setLoading(false);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-[420px] p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Пополнить баланс</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-sm text-gray-500 mb-2">Сумма пополнения</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map(p => (
            <button key={p} onClick={() => setAmount(p)} className={`py-2 rounded-[10px] text-sm font-medium transition-colors ${amount === p ? 'bg-[#3E8D43] text-white' : 'bg-[#F7F7F7] text-gray-700 hover:bg-gray-200'}`}>
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
            </div>
          </div>
          <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] mb-3 focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono tracking-wider" />
          <div className="flex gap-3">
            <input type="text" placeholder="ММ/ГГ" maxLength={5} className="flex-1 px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono" />
            <input type="text" placeholder="CVV" maxLength={3} className="w-24 px-3 py-2.5 bg-[#F7F7F7] rounded-[10px] text-[15px] focus:outline-none focus:ring-1 focus:ring-[#3E8D43] font-mono" />
          </div>
        </div>
        
        <div className="bg-[#F7F7F7] rounded-[10px] p-3 mb-4 text-xs text-gray-500">
          Демо-режим. Данные не сохраняются.
        </div>
        
        <button onClick={handleTopUp} disabled={loading || amount <= 0} className="w-full py-3 bg-[#3E8D43] text-white rounded-[12px] font-semibold hover:bg-[#357a3a] transition-colors disabled:opacity-50">
          {loading ? "Обработка..." : `Оплатить ${amount} ₽`}
        </button>
      </div>
    </div>
  );
}

// Ежедневный бонус
function DailyBonus({ onClaim, claimed }) {
  const [timeLeft, setTimeLeft] = useState("");
  
  useEffect(() => {
    if (claimed) {
      const updateTimer = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}ч ${minutes}м`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [claimed]);
  
  return (
    <div className={`rounded-[16px] p-4 ${claimed ? 'bg-gray-100' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-semibold ${claimed ? 'text-gray-400' : 'text-white'}`}>🎁 Бонус</div>
          <div>
            <div className={`font-semibold ${claimed ? 'text-gray-500' : 'text-white'}`}>
              {claimed ? "Бонус получен" : "Ежедневный бонус"}
            </div>
            <div className={`text-sm ${claimed ? 'text-gray-400' : 'text-white/80'}`}>
              {claimed ? `Следующий через ${timeLeft}` : "+50 монет за визит"}
            </div>
          </div>
        </div>
        {!claimed && (
          <button onClick={onClaim} className="px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-colors">
            Забрать
          </button>
        )}
      </div>
    </div>
  );
}

function CommunityGoals({ goals }) {
  if (!goals || goals.length === 0) return null;
  return (
    <div className="bg-white rounded-[16px] p-4 sm:p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-gray-900">Цели сообщества</div>
        <span className="text-xs text-gray-400">Общие для всех</span>
      </div>
      <div className="space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="p-3 rounded-[12px] bg-gray-50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-medium text-sm text-gray-900">{goal.title}</div>
              {goal.completed && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Выполнено</span>}
            </div>
            {goal.description && <div className="text-xs text-gray-500 mb-2">{goal.description}</div>}
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#86efac] to-[#3E8D43]" style={{ width: `${Math.min(100, goal.progress || 0)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{goal.current_value} / {goal.target_value}</span>
              <span>{goal.reward || ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyPlants({ user, onNavigate }) {
  const [adoptions, setAdoptions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [stats, setStats] = useState(null);
  const [level, setLevel] = useState(null);
  const [communityGoals, setCommunityGoals] = useState([]);
  const [dailyClaimed, setDailyClaimed] = useState(() => {
    const lastClaim = localStorage.getItem('lastDailyClaim');
    if (!lastClaim) return false;
    const lastDate = new Date(lastClaim).toDateString();
    return lastDate === new Date().toDateString();
  });
  
  async function loadData() {
    setLoading(true);
    try {
      const [adoptionsRes, balanceRes, statsRes, goalsRes] = await Promise.all([
        getMyAdoptions(),
        getBalance(),
        getUserStats(),
        getCommunityGoals()
      ]);
      
      if (adoptionsRes.ok) setAdoptions(adoptionsRes.data || []);
      if (balanceRes.ok) setBalance(balanceRes.data?.balance || 0);
      if (statsRes.ok) {
        setStats(statsRes.data.stats);
        setLevel(statsRes.data.level);
        try {
          localStorage.setItem('gryadka_cached_stats', JSON.stringify(statsRes.data.stats));
          localStorage.setItem('gryadka_cached_level', JSON.stringify(statsRes.data.level));
        } catch {}
      }
      if (goalsRes?.ok) setCommunityGoals(goalsRes.data || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
    setLoading(false);
  }
  
  useEffect(() => {
    try {
      const cachedStats = localStorage.getItem('gryadka_cached_stats');
      const cachedLevel = localStorage.getItem('gryadka_cached_level');
      if (cachedStats) setStats(JSON.parse(cachedStats));
      if (cachedLevel) setLevel(JSON.parse(cachedLevel));
    } catch {}
    if (user) loadData();
  }, [user]);
  
  const handleTopUp = async (amount) => {
    const res = await topUpBalance(amount);
    if (res.ok) {
      setBalance(res.data.balance);
      if (stats) setStats(prev => ({ ...prev, balance: res.data.balance }));
    }
  };
  
  const handleClaimDaily = async () => {
    // Фейковый бонус
    const res = await topUpBalance(50);
    if (res.ok) {
      setBalance(res.data.balance);
      setDailyClaimed(true);
      localStorage.setItem('lastDailyClaim', new Date().toISOString());
    }
  };
  
  const handleDeleteAdoption = async (adoptionId) => {
    if (!window.confirm("Отписаться от этого растения?")) return;
    const res = await deleteAdoption(adoptionId);
    if (res.ok) {
      setAdoptions(prev => prev.filter(a => a.id !== adoptionId));
    }
  };
  
  const handleUpdateNickname = async (adoptionId, nickname) => {
    const res = await updateAdoptionNickname(adoptionId, nickname);
    if (res.ok) {
      setAdoptions(prev => prev.map(a => a.id === adoptionId ? { ...a, nickname } : a));
    }
  };
  
  const handleActionComplete = async (newBalance, spentDelta = 0) => {
    setBalance(newBalance);
    const prevStats = stats;
    try {
      const refreshed = await getUserStats();
      if (refreshed.ok && refreshed.data?.stats) {
        const incoming = refreshed.data.stats;
        // Если бэкенд не успел обновить сумму, добиваем вручную
        const coercedTotalSpent = spentDelta > 0 && prevStats
          ? Math.max(incoming.total_spent || 0, (prevStats.total_spent || 0) + spentDelta)
          : incoming.total_spent;
        const coercedBoosts = spentDelta > 0 && prevStats
          ? Math.max(incoming.boosts || 0, (prevStats.boosts || 0) + 1)
          : incoming.boosts;
        
        setStats({
          ...incoming,
          balance: newBalance,
          boosts: coercedBoosts,
          total_spent: coercedTotalSpent
        });
        setLevel(refreshed.data.level);
        return;
      }
    } catch (e) {
      console.error("Failed to refresh stats after action", e);
    }
    // Фолбек без запроса — хотя бы обновим локальные цифры
    setStats(prev => {
      const base = prev || { adoptions: adoptions.length, boosts: 0, total_spent: 0, balance: newBalance };
      return { 
        ...base, 
        balance: newBalance, 
        boosts: (base.boosts || 0) + 1, 
        total_spent: (base.total_spent || 0) + spentDelta 
      };
    });
  };
  
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="text-center py-12 sm:py-16 bg-gradient-to-b from-green-50 to-white rounded-2xl sm:rounded-3xl px-4">
          <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 text-gray-800">Растения</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Войдите в аккаунт</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">Чтобы видеть свои растения</p>
          <button onClick={() => onNavigate("login")} className="px-6 sm:px-8 py-3 bg-[#3E8D43] text-white rounded-xl font-medium hover:bg-[#357a3a]">
            Войти
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      {/* Шапка с уровнем */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 mb-5 sm:mb-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Левая часть - инфо */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#3E8D43] to-[#2d6b31] flex items-center justify-center text-xl sm:text-2xl font-bold">
              {level?.level || 1}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">{user.first_name || "Садовод"}</h1>
              <div className="text-white/60 text-sm sm:text-base">{level?.name || "Новичок"}</div>
              {level && (
                <div className="mt-2 w-36 sm:w-40">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{level.xp} XP</span>
                  <span>{level.xp_for_next}</span>
                </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3E8D43] rounded-full" style={{ width: `${level.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Статистика */}
          <div className="flex gap-4 sm:gap-6 flex-wrap">
            <div className="text-center min-w-[72px]">
              <div className="text-2xl font-bold">{adoptions.length}</div>
              <div className="text-xs text-white/50">Растений</div>
            </div>
            <div className="text-center min-w-[72px]">
              <div className="text-2xl font-bold">{stats?.boosts || 0}</div>
              <div className="text-xs text-white/50">Бустов</div>
            </div>
            <div className="text-center min-w-[72px]">
              <div className="text-2xl font-bold">{stats?.total_spent || 0}₽</div>
              <div className="text-xs text-white/50">Потрачено</div>
            </div>
          </div>
          
          {/* Баланс */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white/10 rounded-xl px-4 py-3 flex-1 sm:flex-none">
              <div className="text-xs text-white/50 mb-0.5">Баланс</div>
              <div className="text-lg sm:text-xl font-bold">{balance} ₽</div>
            </div>
            <button onClick={() => setShowTopUp(true)} className="px-4 sm:px-5 py-3 sm:py-4 bg-[#3E8D43] rounded-xl font-medium hover:bg-[#357a3a] transition-colors w-full sm:w-auto text-sm sm:text-base">
              + Пополнить
            </button>
          </div>
        </div>
      </div>
      
      {/* Ежедневный бонус */}
      <div className="mb-5 sm:mb-6">
        <DailyBonus onClaim={handleClaimDaily} claimed={dailyClaimed} />
      </div>

      {communityGoals.length > 0 && (
        <div className="mb-6">
          <CommunityGoals goals={communityGoals} />
        </div>
      )}
      
      {/* Заголовок раздела */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Мои растения
          {adoptions.length > 0 && <span className="ml-2 text-gray-400 font-normal">({adoptions.length})</span>}
        </h2>
        {adoptions.length > 0 && (
          <button onClick={() => onNavigate("products")} className="text-[#3E8D43] font-medium hover:underline flex items-center gap-1 text-sm sm:text-base">
            <span>+</span> Добавить ещё
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="py-12 sm:py-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#3E8D43] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : adoptions.length === 0 ? (
        <div className="text-center py-14 sm:py-16 bg-gradient-to-b from-[#F7F7F7] to-white rounded-2xl sm:rounded-3xl px-4">
          <div className="text-3xl sm:text-4xl mb-3 text-gray-800">Растения</div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">У вас пока нет растений</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm sm:text-base">
            Выберите растение, станьте его опекуном и следите за ростом в реальном времени
          </p>
          <button onClick={() => onNavigate("products")} className="px-6 sm:px-8 py-3 bg-[#3E8D43] text-white rounded-xl font-medium hover:bg-[#357a3a] transition-colors text-sm sm:text-base">
            Найти растение
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {adoptions.map((adoption, index) => (
            <PlantCard
              key={adoption.id}
              adoption={adoption}
              onOpenShop={setSelectedPlant}
              onDelete={handleDeleteAdoption}
              onUpdateNickname={handleUpdateNickname}
              onNavigate={onNavigate}
              index={index}
            />
          ))}
        </div>
      )}
      
      {/* Модалки */}
      <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} onTopUp={handleTopUp} currentBalance={balance} />
      
      {selectedPlant && (
        <PlantBoostShop plant={selectedPlant} balance={balance} onClose={() => setSelectedPlant(null)} onActionComplete={handleActionComplete} />
      )}
      
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}
