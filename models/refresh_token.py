# -*- coding: utf-8 -*-
"""
Refresh Token Model
-------------------
SQLAlchemy модель для хранения refresh токенов пользователей.
"""

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from database.database import Base


class RefreshToken(Base):
    """
    Модель refresh токена в базе данных.
    
    Хранит информацию о refresh токенах пользователей, включая дату истечения,
    статус отзыва и информацию об устройстве.
    
    Attributes:
        id (int): Уникальный идентификатор токена (первичный ключ).
        user_id (int): ID пользователя, которому принадлежит токен.
        token_hash (str): Хешированное значение токена (уникальное).
        created_at (datetime): Дата и время создания токена.
        expires_at (datetime): Дата и время истечения токена.
        revoked (bool): Флаг, указывающий на то, что токен был отозван.
        replaced_by (int): ID нового токена, который заменил этот (при ротации).
        device_info (str): Информация об устройстве, с которого был создан токен.
    """
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    replaced_by = Column(Integer, nullable=True)
    device_info = Column(Text, nullable=True)