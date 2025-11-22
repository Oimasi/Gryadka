# -*- coding: utf-8 -*-
"""
Sensor Schemas (Pydantic V2 compatible)
--------------
Pydantic схемы для валидации данных датчиков с поддержкой Pydantic V2.
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class SensorReadingCreate(BaseModel):
    """
    Схема для создания нового показания датчика.
    Используется для приема данных от ESP32.
    """
    api_key: str = Field(..., min_length=20, max_length=100, description="API ключ датчика")
    temperature: Optional[float] = Field(None, ge=-50, le=100, description="Температура в °C")
    ph: Optional[float] = Field(None, ge=0, le=14, description="Уровень pH")
    salinity: Optional[float] = Field(None, ge=0, le=10000, description="Соленость почвы (ppm)")
    humidity: Optional[int] = Field(None, ge=0, le=100, description="Влажность в %")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="Дополнительные данные в формате JSON")
    
    @field_validator('raw_data')
    @classmethod
    def validate_raw_data(cls, v):
        if not isinstance(v, dict):
            return {}
        if len(str(v)) > 1000:
            raise ValueError("raw_data слишком большой")
        return v
    
    model_config = ConfigDict(from_attributes=True)

class SensorReadingOut(BaseModel):
    """
    Схема для возврата показаний датчика.
    """
    id: int
    device_id: int
    temperature: Optional[float]
    ph: Optional[float]
    salinity: Optional[float]
    humidity: Optional[int]
    raw_data: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SensorDeviceCreate(BaseModel):
    """
    Схема для регистрации нового датчика (для админов).
    """
    name: str = Field(..., min_length=3, max_length=200)
    product_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class SensorDeviceOut(BaseModel):
    """
    Схема для возврата информации о датчике.
    """
    id: int
    name: str
    is_active: bool
    product_id: Optional[int]
    last_seen: Optional[datetime]
    created_at: datetime
    api_key: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)