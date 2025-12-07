# -*- coding: utf-8 -*-
"""
User Schemas
------------
Pydantic схемы для работы с пользовательскими данными.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional

# Допустимые роли пользователей
ALLOWED_ROLES = ("consumer", "farmer", "admin")


class UserCreate(BaseModel):
    """
    Схема для создания нового пользователя.
    
    Используется при регистрации новых пользователей. 
    Поле 'role' ограничено значениями 'consumer' и 'farmer' для публичной регистрации.
    
    Attributes:
        email (EmailStr): Адрес электронной почты пользователя.
        password (str): Пароль пользователя (минимум 8 символов).
        first_name (str): Имя пользователя (1-100 символов).
        last_name (str): Фамилия пользователя (1-100 символов).
        middle_name (Optional[str]): Отчество пользователя (до 100 символов, опционально).
        role (Literal["consumer", "farmer"]): Роль пользователя (по умолчанию "consumer").
    """
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    role: Literal["consumer", "farmer"] = Field(default="consumer")


class User(BaseModel):
    """
    Схема для возврата информации о пользователе.
    
    Используется для сериализации данных пользователя при возврате из API.
    Включает все основные поля пользователя, кроме пароля.
    
    Attributes:
        id (int): Уникальный идентификатор пользователя.
        email (EmailStr): Адрес электронной почты пользователя.
        first_name (str): Имя пользователя.
        last_name (str): Фамилия пользователя.
        middle_name (Optional[str]): Отчество пользователя (может быть null).
        role (str): Роль пользователя.
        balance (int): Игровой баланс пользователя.
    """
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    middle_name: Optional[str]
    role: str
    balance: int = 1000

    class Config:
        orm_mode = True