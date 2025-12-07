# -*- coding: utf-8 -*-
"""
Gamification Router
-------------------
API для геймификации: магазин, усыновления, действия, баланс.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging
from datetime import datetime, timedelta
import pytz

from database.database import get_db
from models.gamification import Adoption, GameItem, UserAction, CommunityGoal, GoalType

def get_moscow_time():
    moscow_tz = pytz.timezone('Europe/Moscow')
    return datetime.now(moscow_tz).replace(tzinfo=None)
from models.product import Product
from models.user import User as UserModel
from schemas.gamification import (
    GameItemOut, 
    AdoptionCreate, AdoptionOut, AdoptionWithProduct,
    UserActionCreate, UserActionOut,
    BalanceOut, BalanceTopUp,
    ProductGrowthInfo,
    CommunityGoalOut
)
from utils.auth import get_current_user

logger = logging.getLogger("gamification_router")
router = APIRouter(prefix="/api/game", tags=["gamification"])

# Уровни и XP
LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000]
LEVEL_NAMES = ["Новичок", "Садовод", "Огородник", "Фермер", "Агроном", "Бабушка", "Эксперт", "Гуру", "Легенда", "Магнат", "Титан", "Бог урожая"]

def get_level_info(xp: int):
    """Получить уровень и прогресс по XP"""
    level = 0
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i
        else:
            break
    
    current_threshold = LEVEL_THRESHOLDS[level]
    next_threshold = LEVEL_THRESHOLDS[level + 1] if level + 1 < len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1] + 5000
    progress = int(((xp - current_threshold) / (next_threshold - current_threshold)) * 100) if next_threshold > current_threshold else 100
    
    return {
        "level": level + 1,
        "name": LEVEL_NAMES[min(level, len(LEVEL_NAMES) - 1)],
        "xp": xp,
        "xp_for_next": next_threshold,
        "progress": min(100, max(0, progress))
    }

# Достижения
ACHIEVEMENTS = [
    {"id": "first_adopt", "name": "Первое опекунство", "description": "Станьте опекуном первого растения", "icon": "seedling", "xp": 50},
    {"id": "adopt_5", "name": "Заботливый садовод", "description": "Станьте опекуном 5 растений", "icon": "tree", "xp": 150},
    {"id": "adopt_10", "name": "Опытный фермер", "description": "Станьте опекуном 10 растений", "icon": "forest", "xp": 300},
    {"id": "first_boost", "name": "Первый буст", "description": "Купите первый буст для растения", "icon": "sparkle", "xp": 30},
    {"id": "boost_10", "name": "Активный помощник", "description": "Купите 10 бустов", "icon": "fire", "xp": 100},
    {"id": "boost_50", "name": "Мастер бустов", "description": "Купите 50 бустов", "icon": "rocket", "xp": 250},
    {"id": "spend_1000", "name": "Инвестор", "description": "Потратьте 1000₽ на уход", "icon": "coin", "xp": 100},
    {"id": "spend_5000", "name": "Меценат", "description": "Потратьте 5000₽ на уход", "icon": "diamond", "xp": 300},
]


# === Магазин предметов ===

@router.get("/items", response_model=List[GameItemOut])
def get_game_items(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Получить список всех предметов магазина.
    Можно фильтровать по категории (water, fertilizer, protection, climate, soil, care).
    """
    query = db.query(GameItem).filter(GameItem.is_active == True)
    
    if category:
        query = query.filter(GameItem.effect_type.like(f"{category}%"))
    
    items = query.order_by(GameItem.price.asc()).all()
    return items


@router.get("/items/{item_id}", response_model=GameItemOut)
def get_game_item(item_id: int, db: Session = Depends(get_db)):
    """Получить конкретный предмет по ID."""
    item = db.query(GameItem).filter(GameItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# === Баланс пользователя ===

@router.get("/balance", response_model=BalanceOut)
def get_balance(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить текущий баланс пользователя."""
    return {"balance": current_user.balance or 0}


@router.get("/stats")
def get_user_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику и достижения пользователя."""
    from sqlalchemy import func
    
    # Считаем статистику
    adoptions_count = db.query(Adoption).filter(Adoption.user_id == current_user.id).count()
    actions_count = db.query(UserAction).filter(UserAction.user_id == current_user.id).count()
    
    # Считаем потраченные деньги (по действиям)
    total_spent_result = db.query(func.sum(GameItem.price)).join(
        UserAction, UserAction.item_id == GameItem.id
    ).filter(UserAction.user_id == current_user.id).scalar()
    total_spent = int(total_spent_result or 0)
    
    # Добавляем стоимость опекунств
    total_spent += adoptions_count * ADOPTION_PRICE
    
    # Считаем XP
    xp = adoptions_count * 50 + actions_count * 10 + (total_spent // 100) * 5
    level_info = get_level_info(xp)
    
    # Проверяем достижения
    unlocked_achievements = []
    for ach in ACHIEVEMENTS:
        unlocked = False
        if ach["id"] == "first_adopt" and adoptions_count >= 1:
            unlocked = True
        elif ach["id"] == "adopt_5" and adoptions_count >= 5:
            unlocked = True
        elif ach["id"] == "adopt_10" and adoptions_count >= 10:
            unlocked = True
        elif ach["id"] == "first_boost" and actions_count >= 1:
            unlocked = True
        elif ach["id"] == "boost_10" and actions_count >= 10:
            unlocked = True
        elif ach["id"] == "boost_50" and actions_count >= 50:
            unlocked = True
        elif ach["id"] == "spend_1000" and total_spent >= 1000:
            unlocked = True
        elif ach["id"] == "spend_5000" and total_spent >= 5000:
            unlocked = True
        
        unlocked_achievements.append({
            **ach,
            "unlocked": unlocked
        })
    
    return {
        "stats": {
            "adoptions": adoptions_count,
            "boosts": actions_count,
            "total_spent": total_spent,
            "balance": current_user.balance or 0
        },
        "level": level_info,
        "achievements": unlocked_achievements
    }


@router.post("/balance/topup", response_model=BalanceOut)
def topup_balance(
    payload: BalanceTopUp,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Пополнить баланс (демо-режим, без реальной оплаты).
    Максимум 10000 за раз.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if payload.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum top-up is 10000")
    
    current_user.balance = (current_user.balance or 0) + payload.amount
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"User {current_user.id} topped up {payload.amount}, new balance: {current_user.balance}")
    return {"balance": current_user.balance}


# === Усыновления ===

ADOPTION_PRICE = 300  # Цена за опекунство


def calculate_health_details(db: Session, product_id: int, user_id: int):
    """
    Оценка «здоровья» растения по активности пользователя.
    Учитываем:
    - Свежесть последнего действия
    - Количество действий за 7 дней
    - Диверсификацию типов бустов
    - Перекос/отсутствие ухода (тяжёлые состояния)
    Также строим историю за 7 дней для мини-графика.
    """
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Последнее действие
    last_action = db.query(UserAction).filter(
        UserAction.product_id == product_id,
        UserAction.user_id == user_id
    ).order_by(UserAction.created_at.desc()).first()

    actions_week = db.query(UserAction).filter(
        UserAction.product_id == product_id,
        UserAction.user_id == user_id,
        UserAction.created_at >= week_ago
    ).all()

    score = 50  # базовый
    tip = None

    # Свежесть
    if last_action:
        hours_from_last = (now - last_action.created_at).total_seconds() / 3600
        if hours_from_last <= 24:
            score += 20
        elif hours_from_last <= 72:
            score += 10
        elif hours_from_last <= 168:
            score += 0
        else:
            score -= 15
    else:
        score -= 25
        tip = "Сделайте любой буст, чтобы восстановить здоровье"

    # Количество действий за неделю
    actions_count = len(actions_week)
    score += min(20, actions_count * 4)  # до +20

    # Диверсификация типов
    effect_types = {a.action_type for a in actions_week if a.action_type}
    if len(effect_types) >= 3:
        score += 10
    elif len(effect_types) == 2:
        score += 5

    # Тяжёлые состояния
    heavy_state = None
    if actions_count == 0 or (last_action and (now - last_action.created_at).days >= 5):
        heavy_state = "neglect"
        score -= 10
        tip = tip or "Нет ухода несколько дней. Сделайте полив/удобрение."
    else:
        # Перекорм/перелив: >5 действий за 24ч или >3 одинакового типа подряд
        day_ago = now - timedelta(hours=24)
        last_24h = [a for a in actions_week if a.created_at >= day_ago]
        if len(last_24h) >= 6:
            heavy_state = "overcare"
            score -= 10
            tip = "Слишком много бустов за сутки. Дайте растению отдохнуть."
        else:
            # Проверим перекос по типу
            if actions_week:
                sorted_week = sorted(actions_week, key=lambda x: x.created_at, reverse=True)
                streak_type = None
                streak_len = 0
                for a in sorted_week:
                    if a.action_type == streak_type:
                        streak_len += 1
                    else:
                        streak_type = a.action_type
                        streak_len = 1
                    if streak_len >= 4:
                        heavy_state = "monotype"
                        tip = "Добавьте другой тип буста для баланса."
                        score -= 8
                        break

    # Ограничиваем
    score = max(0, min(100, score))

    if score >= 80:
        status = "Отличное"
    elif score >= 60:
        status = "Хорошее"
    elif score >= 40:
        status = "Среднее"
    else:
        status = "Нужен уход"

    # История за 7 дней (простая: счёт по количеству действий в день)
    history = []
    for i in range(7, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_actions = [a for a in actions_week if day_start <= a.created_at < day_end]
        day_score = min(100, len(day_actions) * 15 + 40) if day_actions else 30
        history.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "score": day_score
        })

    return {
        "score": score,
        "status": status,
        "heavy_state": heavy_state,
        "tip": tip,
        "history": history
    }


def update_community_goals(db: Session, goal_type: GoalType, increment: int):
    """
    Обновляет прогресс активных целей сообщества соответствующего типа.
    """
    now = datetime.utcnow()
    active_goals = db.query(CommunityGoal).filter(
        CommunityGoal.is_active == True,
        CommunityGoal.goal_type == goal_type,
        (CommunityGoal.starts_at == None) | (CommunityGoal.starts_at <= now),
        (CommunityGoal.ends_at == None) | (CommunityGoal.ends_at >= now)
    ).all()

    for goal in active_goals:
        goal.current_value = (goal.current_value or 0) + increment
    db.commit()


def ensure_default_goals(db: Session):
    """
    Если целей нет, создаём пару дефолтных недельных челленджей.
    """
    existing = db.query(CommunityGoal).count()
    if existing > 0:
        return
    now = datetime.utcnow()
    week_later = now + timedelta(days=7)
    goals = [
        CommunityGoal(
            title="Совместно купить 20 бустов",
            description="Поможем растениям вместе — купите бусты",
            goal_type=GoalType.boosts,
            target_value=20,
            current_value=0,
            reward="+150 XP каждому участнику",
            starts_at=now,
            ends_at=week_later
        ),
        CommunityGoal(
            title="Потратить 3000₽ на уход",
            description="Инвестируем в уход за растениями",
            goal_type=GoalType.spent,
            target_value=3000,
            current_value=0,
            reward="Редкий стикер для профиля",
            starts_at=now,
            ends_at=week_later
        ),
    ]
    db.add_all(goals)
    db.commit()

@router.get("/adoption-price")
def get_adoption_price():
    """Получить цену за опекунство."""
    return {"price": ADOPTION_PRICE}

@router.post("/adopt", response_model=AdoptionOut, status_code=201)
def adopt_product(
    payload: AdoptionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Усыновить растущий продукт.
    Можно усыновлять только продукты с is_growing=True.
    Стоимость: 300 рублей.
    """
    # Проверяем продукт
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.is_growing:
        raise HTTPException(status_code=400, detail="Can only adopt growing products")
    
    # Проверяем, не усыновлен ли уже
    existing = db.query(Adoption).filter(
        Adoption.user_id == current_user.id,
        Adoption.product_id == payload.product_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already adopted this product")
    
    # Проверяем баланс
    current_balance = current_user.balance or 0
    if current_balance < ADOPTION_PRICE:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Need {ADOPTION_PRICE}, have {current_balance}"
        )
    
    # Списываем баланс
    current_user.balance = current_balance - ADOPTION_PRICE
    
    # Создаём усыновление
    adoption = Adoption(
        user_id=current_user.id,
        product_id=payload.product_id,
        nickname=payload.nickname,
        adopted_at=get_moscow_time()
    )
    db.add(adoption)
    
    try:
        db.commit()
        db.refresh(adoption)
        update_community_goals(db, GoalType.adoptions, 1)
        update_community_goals(db, GoalType.spent, ADOPTION_PRICE)
    except Exception as exc:
        db.rollback()
        logger.exception(f"Failed to create adoption: {exc}")
        raise HTTPException(status_code=500, detail="Failed to adopt product")
    
    logger.info(f"User {current_user.id} adopted product {payload.product_id}")
    return adoption


@router.get("/adoptions", response_model=List[AdoptionWithProduct])
def get_my_adoptions(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список моих усыновлённых растений."""
    adoptions = db.query(Adoption).filter(
        Adoption.user_id == current_user.id
    ).options(
        joinedload(Adoption.product)
    ).order_by(Adoption.adopted_at.desc()).all()
    
    result = []
    for adoption in adoptions:
        product = adoption.product
        
        # Рассчитываем прогресс роста (примерно 30 дней до сбора)
        days_growing = (datetime.utcnow() - product.created_at).days if product.created_at else 0
        days_total = 30  # Примерный срок выращивания
        growth_percent = min(100, int((days_growing / days_total) * 100))
        
        # Получаем URL изображения
        primary_image_url = None
        if product.media:
            primary = next((m for m in product.media if m.is_primary), None)
            if primary:
                primary_image_url = f"/api/products/media/{primary.id}/file"
        
        health = calculate_health_details(db, adoption.product_id, adoption.user_id)

        result.append(AdoptionWithProduct(
            id=adoption.id,
            user_id=adoption.user_id,
            product_id=adoption.product_id,
            adopted_at=adoption.adopted_at,
            nickname=adoption.nickname,
            product_name=product.name,
            product_category=product.category,
            farm_name=product.farm.name if product.farm else None,
            is_halal=bool(getattr(product, "is_halal", False)),
            is_lenten=bool(getattr(product, "is_lenten", False)),
            days_growing=days_growing,
            growth_percent=growth_percent,
            primary_image_url=primary_image_url,
            health_score=health["score"],
            health_status=health["status"],
            health_state=health.get("heavy_state"),
            health_tip=health.get("tip")
        ))
    
    return result


@router.delete("/adoptions/{adoption_id}", status_code=204)
def delete_adoption(
    adoption_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отменить усыновление."""
    adoption = db.query(Adoption).filter(
        Adoption.id == adoption_id,
        Adoption.user_id == current_user.id
    ).first()
    
    if not adoption:
        raise HTTPException(status_code=404, detail="Adoption not found")
    
    db.delete(adoption)
    db.commit()
    return {}


@router.patch("/adoptions/{adoption_id}/nickname")
def update_adoption_nickname(
    adoption_id: int,
    nickname: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить никнейм усыновлённого растения."""
    adoption = db.query(Adoption).filter(
        Adoption.id == adoption_id,
        Adoption.user_id == current_user.id
    ).first()
    
    if not adoption:
        raise HTTPException(status_code=404, detail="Adoption not found")
    
    adoption.nickname = nickname[:100] if nickname else None
    db.commit()
    return {"status": "ok", "nickname": adoption.nickname}


# === Действия (покупка бустов) ===

@router.post("/action", response_model=UserActionOut, status_code=201)
def perform_action(
    payload: UserActionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Выполнить действие над растением (купить буст).
    Списывает баланс и создаёт запись действия.
    """
    # Проверяем предмет
    item = db.query(GameItem).filter(GameItem.id == payload.item_id, GameItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Проверяем продукт
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product.is_growing:
        raise HTTPException(status_code=400, detail="Can only apply boosts to growing products")
    
    # Проверяем баланс
    current_balance = current_user.balance or 0
    if current_balance < item.price:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Need {item.price}, have {current_balance}"
        )
    
    # Списываем баланс
    current_user.balance = current_balance - item.price
    
    # Создаём действие
    action = UserAction(
        user_id=current_user.id,
        product_id=payload.product_id,
        action_type=item.effect_type,
        item_id=item.id,
        created_at=get_moscow_time()
    )
    db.add(action)
    
    try:
        db.commit()
        db.refresh(action)
        db.refresh(current_user)
        update_community_goals(db, GoalType.boosts, 1)
        update_community_goals(db, GoalType.spent, item.price)
    except Exception as exc:
        db.rollback()
        logger.exception(f"Failed to perform action: {exc}")
        raise HTTPException(status_code=500, detail="Failed to perform action")
    
    logger.info(f"User {current_user.id} applied {item.name} to product {payload.product_id}, spent {item.price}")
    
    return UserActionOut(
        id=action.id,
        user_id=action.user_id,
        product_id=action.product_id,
        action_type=action.action_type,
        item_id=action.item_id,
        created_at=action.created_at,
        item_name=item.name,
        item_icon=item.icon
    )


@router.get("/actions/{product_id}", response_model=List[UserActionOut])
def get_product_actions(
    product_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Получить историю действий над продуктом.
    Видно всем (публичная история ухода).
    """
    actions = db.query(UserAction).filter(
        UserAction.product_id == product_id
    ).options(
        joinedload(UserAction.item)
    ).order_by(UserAction.created_at.desc()).limit(limit).all()
    
    result = []
    for action in actions:
        result.append(UserActionOut(
            id=action.id,
            user_id=action.user_id,
            product_id=action.product_id,
            action_type=action.action_type,
            item_id=action.item_id,
            created_at=action.created_at,
            item_name=action.item.name if action.item else None,
            item_icon=action.item.icon if action.item else None
        ))
    
    return result


@router.get("/my-actions", response_model=List[UserActionOut])
def get_my_actions(
    limit: int = 100,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить мои действия."""
    actions = db.query(UserAction).filter(
        UserAction.user_id == current_user.id
    ).options(
        joinedload(UserAction.item)
    ).order_by(UserAction.created_at.desc()).limit(limit).all()
    
    result = []
    for action in actions:
        result.append(UserActionOut(
            id=action.id,
            user_id=action.user_id,
            product_id=action.product_id,
            action_type=action.action_type,
            item_id=action.item_id,
            created_at=action.created_at,
            item_name=action.item.name if action.item else None,
            item_icon=action.item.icon if action.item else None
        ))
    
    return result


# === Community Goals ===

@router.get("/community-goals", response_model=List[CommunityGoalOut])
def get_community_goals(
    db: Session = Depends(get_db)
):
    """
    Получить активные цели сообщества.
    Если целей нет — создаём дефолтный набор.
    """
    ensure_default_goals(db)
    now = datetime.utcnow()
    goals = db.query(CommunityGoal).filter(
        CommunityGoal.is_active == True,
        (CommunityGoal.starts_at == None) | (CommunityGoal.starts_at <= now),
        (CommunityGoal.ends_at == None) | (CommunityGoal.ends_at >= now)
    ).order_by(CommunityGoal.ends_at.asc().nulls_last()).all()

    result = []
    for goal in goals:
        progress_raw = int(((goal.current_value or 0) / goal.target_value) * 100) if goal.target_value else 0
        progress = max(0, min(100, progress_raw))
        completed = (goal.current_value or 0) >= goal.target_value
        result.append(CommunityGoalOut(
            id=goal.id,
            title=goal.title,
            description=goal.description,
            goal_type=goal.goal_type.value if hasattr(goal.goal_type, "value") else goal.goal_type,
            target_value=goal.target_value,
            current_value=goal.current_value or 0,
            progress=progress,
            completed=completed,
            reward=goal.reward,
            starts_at=goal.starts_at,
            ends_at=goal.ends_at
        ))
    return result


# === Информация о росте продукта ===

@router.get("/growth/{product_id}", response_model=ProductGrowthInfo)
def get_product_growth(
    product_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить информацию о росте продукта.
    Включает прогресс, усыновление и последние действия.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Рассчитываем прогресс
    days_growing = (datetime.utcnow() - product.created_at).days if product.created_at else 0
    days_total = 30
    growth_percent = min(100, int((days_growing / days_total) * 100))
    
    # Проверяем усыновление
    adoption = db.query(Adoption).filter(
        Adoption.user_id == current_user.id,
        Adoption.product_id == product_id
    ).first()
    
    # Получаем последние действия
    actions = db.query(UserAction).filter(
        UserAction.product_id == product_id
    ).options(
        joinedload(UserAction.item)
    ).order_by(UserAction.created_at.desc()).limit(10).all()
    
    recent_actions = [
        UserActionOut(
            id=a.id,
            user_id=a.user_id,
            product_id=a.product_id,
            action_type=a.action_type,
            item_id=a.item_id,
            created_at=a.created_at,
            item_name=a.item.name if a.item else None,
            item_icon=a.item.icon if a.item else None
        ) for a in actions
    ]
    
    health = calculate_health_details(db, product_id, current_user.id)

    return ProductGrowthInfo(
        product_id=product.id,
        product_name=product.name,
        days_growing=days_growing,
        days_total=days_total,
        growth_percent=growth_percent,
        is_adopted=adoption is not None,
        adoption_nickname=adoption.nickname if adoption else None,
        recent_actions=recent_actions,
        health_score=health["score"],
        health_status=health["status"],
        health_state=health.get("heavy_state"),
        health_tip=health.get("tip"),
        health_history=health.get("history", [])
    )

