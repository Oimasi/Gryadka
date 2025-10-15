# -*- coding: utf-8 -*-
"""
Модели продуктов и связанных сущностей
-------------------------------------
SQLAlchemy модели для Product, ProductPassport и ProductMedia.
Все поля документированы и снабжены ограничениями (где это применимо).
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, DateTime, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database.database import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # название товара
    short_description = Column(String(500), nullable=False, default="")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # связи
    passport = relationship("ProductPassport", back_populates="product", uselist=False, cascade="all, delete-orphan")
    media = relationship("ProductMedia", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_products_owner_active", "owner_id", "is_active"),
    )

class ProductPassport(Base):
    """
    Паспорт товара: структурированные метаданные (JSONB) + несколько полей для быстрого поиска.
    Поле data содержит только строго ожидаемые ключи (валидация в Pydantic).
    """
    __tablename__ = "product_passports"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    # основные индексируемые поля для удобного поиска / фильтрации
    origin = Column(String(200), nullable=True)  # регион/ферма/город
    variety = Column(String(200), nullable=True)  # сорт/вид
    harvest_date = Column(DateTime, nullable=True)
    certifications = Column(JSONB, nullable=False, default=list)  # список сертификатов (структура – список объектов)
    data = Column(JSONB, nullable=False, default={})  # остальная произвольная, но валидируемая структура
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="passport")

class ProductMedia(Base):
    """
    Сведения о медиа (фото) в MinIO. Храним object_key, mime_type и минимальные метаданные.
    Удаление медиа должно сопровождаться удалением объекта в MinIO (см. роутер).
    """
    __tablename__ = "product_media"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    object_key = Column(String(1024), nullable=False)  # ключ/путь в бакете MinIO
    mime_type = Column(String(100), nullable=False, default="image/jpeg")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    meta = Column(JSONB, nullable=False, default={})  # произвольные метаданные (camera, stage, etc.)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    product = relationship("Product", back_populates="media")

    __table_args__ = (
        UniqueConstraint("product_id", "object_key", name="uq_product_media_object"),
    )
