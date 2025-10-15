# -*- coding: utf-8 -*-
"""
Authentication Utilities
------------------------
Модуль для работы с JWT токенами аутентификации: создание, проверка и извлечение текущего пользователя.
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, ExpiredSignatureError
from sqlalchemy.orm import Session

from database.database import get_db
from models.user import User

# Загрузка переменных окружения
load_dotenv()

# Конфигурация секретного ключа для подписи JWT
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY is missing or too short (min 32 chars)")

# Алгоритм шифрования JWT
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Время жизни токена доступа в минутах
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Определение схемы авторизации (Bearer-токен)
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создание JWT токена аутентификации.
    
    Формирует JWT токен с переданными данными и временем истечения.
    Включает уникальный идентификатор токена для возможности последующей инвалидации.
    
    Args:
        data (dict): Словарь данных для включения в токен (обычно содержит sub и role).
        expires_delta (Optional[timedelta]): Время жизни токена. По умолчанию 15 минут.
        
    Returns:
        str: Сформированный JWT токен.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    to_encode.update({"iat": now})  # Время создания токена

    expire = now + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})

    # Добавление уникального идентификатора токена
    to_encode.update({"jti": secrets.token_urlsafe(16)})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Извлечение текущего аутентифицированного пользователя из JWT токена.
    
    Проверяет действительность токена из заголовка Authorization и возвращает
    соответствующего пользователя из базы данных.
    
    Args:
        credentials (HTTPAuthorizationCredentials): Объект с данными токена из заголовка.
        db (Session): Сессия SQLAlchemy для доступа к базе данных.
        
    Returns:
        User: Объект пользователя из базы данных.
        
    Raises:
        HTTPException: 
            - 401: Если токен недействителен, истек или не содержит корректного ID пользователя.
            - 403: Если пользователь деактивирован.
    """
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user