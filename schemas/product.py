# -*- coding: utf-8 -*-
"""
Pydantic схемы для работы с продуктами, паспортом и медиа.

"""
from pydantic import BaseModel, Field, validator, constr
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date


CertItem = Dict[str, Any]  # { "name": str, "issuer": str, "date": "YYYY-MM-DD", "notes": Optional[str] }

class ProductPassportCreate(BaseModel):
    """
    Схема создания/обновления паспорта товара.
    Поля ограничены по длине и формату.
    harvest_date: принимает строку (любую), date или datetime — валидатор попытается распарсить.
    """
    origin: Optional[constr(strip_whitespace=True, min_length=2, max_length=200)] = None
    variety: Optional[constr(strip_whitespace=True, min_length=1, max_length=200)] = None

    # Принимаем либо datetime/date, либо строку (например "11.11.1111" или "2025-10-16").
    harvest_date: Optional[Union[datetime, date, str]] = None

    certifications: List[CertItem] = Field(default_factory=list)
    data: Dict[str, Any] = Field(default_factory=dict, description="Дополнительные структурированные поля (JSON)")

    @validator("certifications", each_item=True)
    def _cert_item_must_have_name(cls, v):
        if not isinstance(v, dict):
            raise ValueError("certification item must be an object")
        if "name" not in v or not v["name"]:
            raise ValueError("certification item must contain 'name'")
        return v

    @validator("harvest_date", pre=True)
    def _parse_harvest_date(cls, v):
        """
        Допускаем:
         - None -> None
         - datetime/date -> возвращаем date()
         - строку ISO 'YYYY-MM-DD' -> конвертируем в date
         - строку 'DD.MM.YYYY' -> парсим как день.месяц.год
         - пустые строки -> None
        """
        if v is None:
            return None
        if isinstance(v, (datetime, date)):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s == "":
                return None
            
            try:
                # datetime.fromisoformat поддерживает 'YYYY-MM-DD' и 'YYYY-MM-DDTHH:MM:SS'
                dt = datetime.fromisoformat(s)
                return dt
            except Exception:
                pass
            # Try DD.MM.YYYY
            try:
                parts = s.split(".")
                if len(parts) == 3:
                    day = int(parts[0]); month = int(parts[1]); year = int(parts[2])
                    return datetime(year=year, month=month, day=day)
            except Exception:
                pass
            
            raise ValueError("harvest_date: unsupported date format, expected ISO 'YYYY-MM-DD' or 'DD.MM.YYYY'")
        raise ValueError("harvest_date: invalid type")
        

class ProductPassportOut(BaseModel):
    origin: Optional[str]
    variety: Optional[str]

    harvest_date: Optional[datetime]
    certifications: List[CertItem]
    data: Dict[str, Any]
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class ProductMediaIn(BaseModel):
    filename: constr(strip_whitespace=True, min_length=3, max_length=255)
    mime_type: Optional[constr(strip_whitespace=True, min_length=3, max_length=100)] = None
    upload_url: Optional[str] = None

class ProductMediaConfirm(BaseModel):
    object_key: constr(strip_whitespace=True, min_length=5, max_length=1024)
    mime_type: Optional[constr(strip_whitespace=True, min_length=3, max_length=100)] = None
    is_primary: bool = False
    meta: Dict[str, Any] = Field(default_factory=dict)

class ProductMediaOut(BaseModel):
    id: int
    filename: str
    object_key: Optional[str] = None
    mime_type: Optional[str] = None
    is_primary: bool
    meta: Dict[str, Any]
    presigned_url: Optional[str] = None

    class Config:
        orm_mode = True


class ProductCreate(BaseModel):
    """
    Схема создания продукта.
    Добавлено поле `passport` — опционально отправляем паспорт при создании.
    """
    name: constr(strip_whitespace=True, min_length=1, max_length=200)
    short_description: constr(strip_whitespace=True, min_length=0, max_length=500)
    farm_id: Optional[int] = None   # optional при создании
    passport: Optional[ProductPassportCreate] = None
    is_active: Optional[bool] = True

class ProductUpdate(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=200)] = None
    short_description: Optional[constr(strip_whitespace=True, min_length=0, max_length=500)] = None
    is_active: Optional[bool] = None
    farm_id: Optional[int] = None   # разрешаем менять farm

class ProductOut(BaseModel):
    id: int
    name: str
    short_description: str
    owner_id: int
    farm_id: Optional[int] = None
    farm_name: Optional[str] = None  
    is_active: bool
    passport: Optional[ProductPassportOut]
    media: List[ProductMediaOut] = []

    class Config:
        orm_mode = True
