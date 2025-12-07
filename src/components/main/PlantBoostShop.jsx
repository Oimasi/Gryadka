import React, { useEffect, useState } from "react";
import { getGameItems, performGameAction, getProductActions, getUserStats } from "../../api";

// Категории
const CATEGORIES = [
  { key: "all", label: "Все" },
  { key: "water", label: "Полив" },
  { key: "fertilizer", label: "Удобрения" },
  { key: "protection", label: "Защита" },
  { key: "climate", label: "Микроклимат" },
  { key: "soil", label: "Почва" },
  { key: "care", label: "Уход" },
];

function formatActionTime(dateString) {
  // Время приходит в московском часовом поясе без указания зоны
  // Добавляем +03:00 чтобы JS правильно интерпретировал
  let date;
  if (dateString && !dateString.includes('+') && !dateString.includes('Z')) {
    date = new Date(dateString + '+03:00');
  } else {
    date = new Date(dateString);
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 0) return "Только что";
  if (diffMins < 1) return "Только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function PlantBoostShop({ plant, balance, onClose, onActionComplete }) {
  const [items, setItems] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [purchasing, setPurchasing] = useState(null);
  const [successItem, setSuccessItem] = useState(null);
  const [tab, setTab] = useState("shop");
  
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [itemsRes, actionsRes] = await Promise.all([
        getGameItems(),
        getProductActions(plant.product_id)
      ]);
      
      if (itemsRes.ok) setItems(itemsRes.data || []);
      if (actionsRes.ok) setActions(actionsRes.data || []);
      setLoading(false);
    }
    load();
  }, [plant.product_id]);
  
  const filteredItems = activeCategory === "all" 
    ? items 
    : items.filter(item => item.effect_type.startsWith(activeCategory));
  
  const handlePurchase = async (item) => {
    if (balance < item.price) return;
    
    setPurchasing(item.id);
    const res = await performGameAction(plant.product_id, item.id);
    setPurchasing(null);
    
    if (res.ok) {
      setSuccessItem(item);
      await onActionComplete(balance - item.price, item.price);
      setActions(prev => [res.data, ...prev]);
      // Обновляем кеш статистики, чтобы «Потрачено»/«Бусты» не отставали
      try {
        const statsRes = await getUserStats();
        if (statsRes.ok && statsRes.data?.stats) {
          localStorage.setItem('gryadka_cached_stats', JSON.stringify(statsRes.data.stats));
          localStorage.setItem('gryadka_cached_level', JSON.stringify(statsRes.data.level));
        }
      } catch (e) {}
      setTimeout(() => setSuccessItem(null), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[520px] rounded-[20px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{plant.nickname || plant.product_name}</h2>
              <p className="text-sm text-gray-500">Бусты для растения</p>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Баланс */}
          <div className="mt-4 flex items-center justify-between bg-[#F7F7F7] rounded-[12px] px-4 py-3">
            <span className="text-sm text-gray-600">Ваш баланс</span>
            <span className="font-semibold">{balance} ₽</span>
          </div>
        </div>
        
        {/* Уведомление об успехе */}
        {successItem && (
          <div className="mx-5 mt-4 p-3 bg-[#3E8D43]/10 rounded-[12px] flex items-center gap-3">
            <svg className="w-5 h-5 text-[#3E8D43]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-[#3E8D43]">{successItem.name} — отправлено фермеру</span>
          </div>
        )}
        
        {/* Табы */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setTab("shop")}
            className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
              tab === "shop" ? "bg-[#3E8D43] text-white" : "bg-[#F7F7F7] text-gray-600 hover:bg-gray-200"
            }`}
          >
            Бусты
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
              tab === "history" ? "bg-[#3E8D43] text-white" : "bg-[#F7F7F7] text-gray-600 hover:bg-gray-200"
            }`}
          >
            История ({actions.length})
          </button>
        </div>
        
        {tab === "shop" ? (
          <>
            {/* Категории */}
            <div className="px-5 py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-[8px] text-sm whitespace-nowrap transition-colors ${
                      activeCategory === cat.key
                        ? "bg-gray-900 text-white"
                        : "bg-[#F7F7F7] text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Список бустов */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Нет бустов в этой категории</div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => {
                    const canAfford = balance >= item.price;
                    const isPurchasing = purchasing === item.id;
                    
                    return (
                      <div 
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-[12px] bg-[#F7F7F7] ${
                          !canAfford && "opacity-50"
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-medium text-[15px]">{item.name}</div>
                          <div className="text-sm text-gray-500 truncate">{item.description}</div>
                        </div>
                        
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={!canAfford || isPurchasing}
                          className={`px-4 py-2 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors ${
                            isPurchasing
                              ? "bg-gray-300 text-gray-500"
                              : canAfford
                                ? "bg-[#3E8D43] text-white hover:bg-[#357a3a]"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {isPurchasing ? "..." : `${item.price} ₽`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* История */
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Пока нет действий</div>
            ) : (
              <div className="space-y-2">
                {actions.map(action => (
                  <div 
                    key={action.id}
                    className="flex items-center justify-between p-3 rounded-[12px] bg-[#F7F7F7]"
                  >
                    <div className="font-medium text-[15px]">{action.item_name}</div>
                    <div className="text-sm text-gray-500">{formatActionTime(action.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Подсказка */}
        <div className="px-5 py-3 border-t border-gray-100 bg-[#FAFAFA]">
          <p className="text-xs text-gray-500 text-center">
            Бусты отправляют напоминание фермеру об уходе за растением
          </p>
        </div>
      </div>
    </div>
  );
}
