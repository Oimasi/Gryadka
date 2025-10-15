# -*- coding: utf-8 -*-
"""
Refresh Token Utilities
-----------------------
Модуль для работы с refresh токенами: создание, проверка, ротация и отзыв.
"""

import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from models.refresh_token import RefreshToken

import os

# Конфигурация параметров refresh токенов
REFRESH_TOKEN_EXP_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))  # Срок действия в днях
REFRESH_TOKEN_BYTES = int(os.getenv("REFRESH_TOKEN_BYTES", "64"))  # Длина токена в байтах
REFRESH_TOKEN_SECRET = os.getenv("REFRESH_TOKEN_SECRET") or os.getenv("SECRET_KEY")
REVOKE_ON_REUSE = os.getenv("REVOKE_ON_REUSE", "0") == "1"

if not REFRESH_TOKEN_SECRET:
    raise RuntimeError("REFRESH_TOKEN_SECRET or SECRET_KEY must be set in environment for refresh token hashing")


def _hash_token_hmac(token: str) -> str:
    """
    Создание HMAC-хеша для токена.
    
    Args:
        token (str): Строка токена для хеширования.
        
    Returns:
        str: Шестнадцатеричное представление HMAC-хеша.
    """
    return hmac.new(REFRESH_TOKEN_SECRET.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()


def create_refresh_token(db: Session, user_id: int, device_info: Optional[str] = None) -> Tuple[str, RefreshToken]:
    """
    Создание нового refresh токена.
    
    Генерирует случайный токен, сохраняет его хеш в базу данных и возвращает
    как plain токен, так и объект базы данных.
    
    Args:
        db (Session): Сессия базы данных SQLAlchemy.
        user_id (int): ID пользователя, которому принадлежит токен.
        device_info (Optional[str]): Информация об устройстве (опционально).
        
    Returns:
        Tuple[str, RefreshToken]: Пара (plain токен, объект RefreshToken из БД).
    """
    plain = secrets.token_urlsafe(REFRESH_TOKEN_BYTES)
    token_hash = _hash_token_hmac(plain)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXP_DAYS)

    db_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        device_info=device_info,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return plain, db_token


def revoke_all_for_user(db: Session, user_id: int):
    """
    Отзыв всех активных refresh токенов для указанного пользователя.
    
    Args:
        db (Session): Сессия базы данных SQLAlchemy.
        user_id (int): ID пользователя, чьи токены нужно отозвать.
    """
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id, RefreshToken.revoked == False).update({"revoked": True})
    db.commit()


class ReuseDetected(Exception):
    """
    Исключение, возникающее при попытке повторного использования refresh токена.
    """
    pass


def verify_and_rotate_refresh_token(db: Session, plain_token: str) -> Tuple[int, str, RefreshToken]:
    """
    Проверка и ротация refresh токена.
    
    Проверяет переданный токен, и если он действителен, создает новый токен,
    отмечает старый как отозванный и возвращает новый токен.
    
    Args:
        db (Session): Сессия базы данных SQLAlchemy.
        plain_token (str): Проверяемый refresh токен.
        
    Returns:
        Tuple[int, str, RefreshToken]: Кортеж (user_id, новый plain токен, новый объект RefreshToken).
        
    Raises:
        ValueError: Если токен недействителен или просрочен.
        ReuseDetected: Если обнаружено повторное использование токена.
    """
    token_hash = _hash_token_hmac(plain_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not db_token:
        raise ValueError("Invalid refresh token")

    if db_token.revoked:
        if REVOKE_ON_REUSE:
            revoke_all_for_user(db, db_token.user_id)
        raise ReuseDetected("Refresh token reuse detected")

    if db_token.expires_at < datetime.now(timezone.utc):
        db_token.revoked = True
        db.commit()
        raise ValueError("Refresh token expired")

    # Ротация токена
    new_plain, new_db = create_refresh_token(db, db_token.user_id, device_info=db_token.device_info)
    db_token.revoked = True
    db_token.replaced_by = new_db.id
    db.commit()
    return db_token.user_id, new_plain, new_db