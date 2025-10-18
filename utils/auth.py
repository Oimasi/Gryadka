# -*- coding: utf-8 -*-
"""
utils/auth.py
Утилиты аутентификации: создание токенов, получение текущего пользователя (строгое и опциональное).
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

# Конфигурация JWT
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY отсутствует или слишком короткий (минимум 32 символа)")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Две схемы аутентификации
security_required = HTTPBearer(auto_error=True)   # Строгое поведение: вызывает исключение при отсутствии/ошибке токена
security_optional = HTTPBearer(auto_error=False)  # Опциональное: возвращает None при отсутствии токена

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создание JWT токена доступа.
    
    Args:
        data (dict): Данные для включения в токен (обычно 'sub' - ID пользователя и 'role').
        expires_delta (Optional[timedelta]): Время жизни токена. По умолчанию используется ACCESS_TOKEN_EXPIRE_MINUTES.
        
    Returns:
        str: Сгенерированный JWT токен.
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    to_encode.update({"iat": now})
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    # Добавление уникального идентификатора токена
    to_encode.update({"jti": secrets.token_urlsafe(16)})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def _decode_token_no_raise(token: str) -> Optional[dict]:
    """
    Декодирование токена без выброса исключений.
    
    Args:
        token (str): JWT токен для декодирования.
        
    Returns:
        Optional[dict]: Данные токена или None в случае ошибки декодирования.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except (ExpiredSignatureError, JWTError):
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_required),
    db: Session = Depends(get_db),
) -> User:
    """
    Получение текущего пользователя (строгая проверка).
    
    Вызывает HTTPException(401/403) при отсутствии, невалидности или истечении срока токена.
    Сохраняет предыдущее поведение.
    
    Args:
        credentials (HTTPAuthorizationCredentials): Авторизационные данные из заголовка.
        db (Session): Сессия базы данных.
        
    Returns:
        User: Объект пользователя.
        
    Raises:
        HTTPException: При отсутствии аутентификации или невалидном токене.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не аутентифицирован",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
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
            detail="Срок действия токена истек",
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
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт пользователя деактивирован")

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Получение текущего пользователя (опциональная проверка).
    
    Возвращает пользователя или None. Не вызывает исключение при отсутствии,
    истечении срока или невалидности токена. Полезно для маршрутов,
    где разрешен анонимный доступ (например, для обслуживания публичных медиа).
    
    Args:
        credentials (Optional[HTTPAuthorizationCredentials]): Авторизационные данные из заголовка.
        db (Session): Сессия базы данных.
        
    Returns:
        Optional[User]: Объект пользователя или None.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = _decode_token_no_raise(token)
    if not payload:
        return None

    sub = payload.get("sub")
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    if not getattr(user, "is_active", True):
        return None

    return user