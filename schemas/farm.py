# -*- coding: utf-8 -*-
"""
Farm Schemas
------------
Pydantic схемы для работы с данными ферм.
"""

from pydantic import BaseModel, Field


class FarmCreate(BaseModel):
    """
    Схема для создания новой фермы.
    
    Используется при создании фермы через API.
    
    Attributes:
        name (str): Название фермы (1-200 символов).
        description (str): Описание фермы (до 2000 символов, опционально).
        owner_id (int): ID пользователя-владельца фермы.
    """
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    owner_id: int


class Farm(BaseModel):
    """
    Схема для возврата информации о ферме.
    
    Используется для сериализации данных фермы при возврате из API.
    
    Attributes:
        id (int): Уникальный идентификатор фермы.
        name (str): Название фермы.
        description (str): Описание фермы.
        owner_id (int): ID пользователя-владельца фермы.
    """
    id: int
    name: str
    description: str
    owner_id: int

    class Config:
        orm_mode = True