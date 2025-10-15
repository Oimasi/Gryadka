# -*- coding: utf-8 -*-
"""
Login Schema
------------
Pydantic схема для аутентификационных данных пользователя.
"""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """
    Схема для запроса аутентификации пользователя.
    
    Используется для валидации данных, передаваемых при попытке входа в систему.
    
    Attributes:
        email (str): Адрес электронной почты пользователя.
        password (str): Пароль пользователя в открытом виде для проверки.
    """
    email: str
    password: str