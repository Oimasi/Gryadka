# -*- coding: utf-8 -*-
"""
Gamification Schemas
--------------------
Pydantic схемы для геймификации.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# === Game Items (Магазин) ===

class GameItemOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: int
    icon: str
    effect_type: str
    is_active: bool = True
    
    class Config:
        from_attributes = True


# === Adoptions (Усыновления) ===

class AdoptionCreate(BaseModel):
    product_id: int
    nickname: Optional[str] = None


class AdoptionOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    adopted_at: datetime
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True


class AdoptionWithProduct(AdoptionOut):
    """Усыновление с информацией о продукте"""
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    farm_name: Optional[str] = None
    is_halal: bool = False
    is_lenten: bool = False
    days_growing: Optional[int] = None
    growth_percent: Optional[int] = None
    primary_image_url: Optional[str] = None
    health_score: Optional[int] = None
    health_status: Optional[str] = None
    health_state: Optional[str] = None
    health_tip: Optional[str] = None


# === User Actions (Действия) ===

class UserActionCreate(BaseModel):
    product_id: int
    item_id: int


class UserActionOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    action_type: str
    item_id: Optional[int] = None
    created_at: datetime
    item_name: Optional[str] = None
    item_icon: Optional[str] = None
    
    class Config:
        from_attributes = True


# === Balance (Баланс) ===

class BalanceOut(BaseModel):
    balance: int


class BalanceTopUp(BaseModel):
    amount: int


# === Product Growth Info ===

class ProductGrowthInfo(BaseModel):
    """Информация о росте растения"""
    product_id: int
    product_name: str
    days_growing: int
    days_total: int
    growth_percent: int
    is_adopted: bool
    adoption_nickname: Optional[str] = None
    recent_actions: List[UserActionOut] = []
    health_score: Optional[int] = None
    health_status: Optional[str] = None
    health_state: Optional[str] = None
    health_tip: Optional[str] = None
    health_history: List["HealthPoint"] = []


# === Community Goals ===
class CommunityGoalOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    goal_type: str
    target_value: int
    current_value: int
    progress: int
    completed: bool
    reward: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HealthPoint(BaseModel):
    date: str
    score: int


ProductGrowthInfo.model_rebuild()

