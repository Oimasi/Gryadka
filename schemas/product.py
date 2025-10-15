# -*- coding: utf-8 -*-
"""
Pydantic схемы для работы с продуктами, паспортом и медиа.
Все поля строго ограничены: длины, форматы и базовая валидация.
"""

from pydantic import BaseModel, Field, EmailStr, validator, constr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Passport related schemas ------------------------------------------------
CertItem = Dict[str, Any]  # { "name": str, "issuer": str, "date": "YYYY-MM-DD", "notes": Optional[str] }

class ProductPassportCreate(BaseModel):
    """
    Схема создания/обновления паспорта товара.
    Поля ограничены по длине и формату.
    """
    origin: Optional[constr(strip_whitespace=True, min_length=2, max_length=200)] = None
    variety: Optional[constr(strip_whitespace=True, min_length=1, max_length=200)] = None
    harvest_date: Optional[datetime] = None
    certifications: List[CertItem] = Field(default_factory=list)
    data: Dict[str, Any] = Field(default_factory=dict, description="Дополнительные структурированные поля (JSON)")

    @validator("certifications", each_item=True)
    def _cert_item_must_have_name(cls, v):
        if not isinstance(v, dict):
            raise ValueError("certification item must be an object")
        if "name" not in v or not v["name"]:
            raise ValueError("certification item must contain 'name'")
        return v

class ProductPassportOut(BaseModel):
    origin: Optional[str]
    variety: Optional[str]
    harvest_date: Optional[datetime]
    certifications: List[CertItem]
    data: Dict[str, Any]
    updated_at: datetime

    class Config:
        orm_mode = True

# --- Media schemas -----------------------------------------------------------
class ProductMediaIn(BaseModel):
    filename: constr(strip_whitespace=True, min_length=3, max_length=255)

class ProductMediaConfirm(BaseModel):
    object_key: constr(strip_whitespace=True, min_length=5, max_length=1024)
    mime_type: constr(strip_whitespace=True, min_length=3, max_length=100)
    is_primary: bool = False
    meta: Dict[str, Any] = Field(default_factory=dict)

class ProductMediaOut(BaseModel):
    id: int
    object_key: str
    mime_type: str
    is_primary: bool
    meta: Dict[str, Any]
    presigned_url: Optional[str] = None

    class Config:
        orm_mode = True

# --- Product schemas ---------------------------------------------------------
class ProductCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=200)
    short_description: constr(strip_whitespace=True, min_length=0, max_length=500)

class ProductUpdate(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=200)] = None
    short_description: Optional[constr(strip_whitespace=True, min_length=0, max_length=500)] = None
    is_active: Optional[bool] = None

class ProductOut(BaseModel):
    id: int
    name: str
    short_description: str
    owner_id: int
    is_active: bool
    passport: Optional[ProductPassportOut]
    media: List[ProductMediaOut] = []

    class Config:
        orm_mode = True
