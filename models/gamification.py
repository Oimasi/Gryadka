# -*- coding: utf-8 -*-
"""
Gamification Models
-------------------
SQLAlchemy модели для геймификации: усыновления, предметы магазина, действия.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base
from datetime import datetime
import pytz
from sqlalchemy import Enum as SAEnum
import enum

def get_moscow_time():
    moscow_tz = pytz.timezone('Europe/Moscow')
    return datetime.now(moscow_tz).replace(tzinfo=None)


class Adoption(Base):
    """
    Модель усыновления растения.
    Связывает пользователя с растущим продуктом.
    """
    __tablename__ = "adoptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    adopted_at = Column(DateTime, nullable=False, default=get_moscow_time)
    nickname = Column(String(100), nullable=True)
    
    # Relationships
    user = relationship("User", backref="adoptions")
    product = relationship("Product", backref="adoptions")


class GameItem(Base):
    """
    Модель предмета магазина (буста).
    """
    __tablename__ = "game_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False)
    icon = Column(String(50), nullable=False)
    effect_type = Column(String(50), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)


class UserAction(Base):
    """
    Модель действия пользователя над растением.
    Логирует все покупки бустов и действия.
    """
    __tablename__ = "user_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)
    item_id = Column(Integer, ForeignKey("game_items.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=get_moscow_time)
    
    # Relationships
    user = relationship("User", backref="actions")
    product = relationship("Product", backref="user_actions")
    item = relationship("GameItem")


class GoalType(enum.Enum):
    boosts = "boosts"        # количество купленных бустов
    spent = "spent"          # сумма трат на уход
    adoptions = "adoptions"  # количество опекунств


class CommunityGoal(Base):
    """
    Глобальная цель сообщества (weekly/monthly challenge).
    """
    __tablename__ = "community_goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(SAEnum(GoalType), nullable=False, index=True)
    target_value = Column(Integer, nullable=False)
    current_value = Column(Integer, nullable=False, default=0)
    reward = Column(String(200), nullable=True)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

