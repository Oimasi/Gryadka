# -*- coding: utf-8 -*-
"""
Farm Model
----------
SQLAlchemy модель для представления фермы в базе данных.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from database.database import Base
from sqlalchemy.orm import relationship

class Farm(Base):
    """
    Модель фермы в базе данных.
    
    Представляет сущность фермы с атрибутами: название, описание и владелец.
    Связана с моделью пользователя через внешний ключ.
    
    Attributes:
        id (int): Уникальный идентификатор фермы (первичный ключ).
        name (str): Название фермы (до 200 символов, индексировано).
        description (str): Описание фермы (текстовое поле, может быть пустым).
        owner_id (int): ID пользователя-владельца (внешний ключ на таблицу users).
        created_at (datetime): Дата и время создания записи (автоматически заполняется).
    """
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    products = relationship("Product", back_populates="farm")

    def __repr__(self):
        return f"<Farm id={self.id} name={self.name}>"