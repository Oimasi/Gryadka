# -*- coding: utf-8 -*-
"""
Модели продуктов и связанных сущностей
-------------------------------------
SQLAlchemy модели для Product, ProductPassport и ProductMedia.
Все поля документированы и снабжены ограничениями (где это применимо).
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, DateTime, UniqueConstraint, Index, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, foreign
from database.database import Base
from sqlalchemy import LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr 


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    short_description = Column(String(500), nullable=False, default="")
    price = Column(Numeric(10, 2), nullable=False, default=0)        # цена — numeric(10,2)
    category = Column(String(100), nullable=False, index=True, default="uncategorized")  # категория

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)

    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    passport = relationship("ProductPassport", back_populates="product", uselist=False, cascade="all, delete-orphan")
    media = relationship("ProductMedia", back_populates="product", cascade="all, delete-orphan")
    farm = relationship("Farm", back_populates="products")

    is_growing = Column(Boolean, nullable=False, default=False, index=True)

    __table_args__ = (
        Index("ix_products_owner_active", "owner_id", "is_active"),
    )


class ProductPassport(Base):
    __tablename__ = "product_passports"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    origin = Column(String(200), nullable=True)
    variety = Column(String(200), nullable=True)
    harvest_date = Column(DateTime, nullable=True)
    certifications = Column(JSONB, nullable=False, default=list)
    data = Column(JSONB, nullable=False, default={})
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    product = relationship("Product", back_populates="passport")


class ProductMedia(Base):
    """
    Теперь храним бинарные данные прямо в Postgres (LargeBinary).
    Поле `object_key` удалено — вместо него есть `filename` и `content`.
    """
    __tablename__ = "product_media"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    object_key = Column(String(512), nullable=False)   
    filename = Column(String(1024), nullable=False)  
    content = Column(LargeBinary, nullable=False)     
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    meta = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    product = relationship("Product", back_populates="media")

    __table_args__ = (
        UniqueConstraint("product_id", "filename", name="uq_product_media_filename"),
    )


class StagedUpload(Base):
    """
    Временное хранилище для файлов, загружаемых через upload_url (эквивалент presign+upload).
    После подтверждения (confirm) данные копируются в ProductMedia и запись StagedUpload удаляется.
    """
    __tablename__ = "staged_uploads"
    id = Column(Integer, primary_key=True, index=True)
    object_key = Column(String(1024), nullable=False, unique=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(1024), nullable=False)
    content = Column(LargeBinary, nullable=False)
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
