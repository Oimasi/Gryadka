# -*- coding: utf-8 -*-
"""
Auth Router
-----------
Маршруты аутентификации: вход, обновление токенов и выход из системы.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status, Request, Cookie, Body
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone

from database.database import get_db
from models.user import User
from schemas.user import User as UserSchema
from utils.security import verify_password
from utils.refresh_tokens import create_refresh_token, verify_and_rotate_refresh_token, ReuseDetected, _hash_token_hmac
from utils.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(tags=["auth"], prefix="/api/auth")

import os

# Конфигурация путей и параметров для refresh токенов
API_PREFIX = os.getenv("API_PREFIX", "/api")
REFRESH_COOKIE_PATH = os.getenv("REFRESH_COOKIE_PATH", f"{API_PREFIX}/auth/refresh")
REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "refresh_token")
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "lax")
REFRESH_COOKIE_SECURE = bool(os.getenv("REFRESH_COOKIE_SECURE", "1") == "1")


@router.post("/login", summary="Аутентификация пользователя")
def login(response: Response, payload: dict = Body(...), db: Session = Depends(get_db), request: Request = None):
    """
    Аутентификация пользователя по email и паролю.
    
    Принимает JSON с полями email и password, возвращает access токен
    и устанавливает refresh токен в cookie.
    
    Args:
        response (Response): Объект ответа FastAPI.
        payload (dict): Словарь с email и password.
        db (Session): Сессия базы данных.
        request (Request): Объект запроса для получения информации об устройстве.
        
    Returns:
        dict: Словарь с access_token, token_type и expires_in.
        
    Raises:
        HTTPException: При неверных учетных данных или неактивном пользователе.
    """
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    access_token = create_access_token({"sub": str(user.id), "role": user.role},
                                       expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    device_info = (request.headers.get("user-agent") if request else None)
    plain_refresh, db_rt = create_refresh_token(db, user.id, device_info=device_info)

    max_age = int((db_rt.expires_at - datetime.now(timezone.utc)).total_seconds())
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=plain_refresh,
        httponly=True,
        secure=REFRESH_COOKIE_SECURE,
        samesite=REFRESH_COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
        max_age=max_age,
    )

    return {"access_token": access_token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60}


@router.post("/refresh", summary="Обновление токенов")
def refresh(response: Response, refresh_token: str = Cookie(None), db: Session = Depends(get_db), request_body: dict = Body(None)):
    """
    Обновление access токена с использованием refresh токена.
    
    Поддерживает два способа передачи refresh токена:
    - через cookie (для веб-клиентов)
    - через тело запроса (для мобильных/CLI клиентов)
    
    Args:
        response (Response): Объект ответа FastAPI.
        refresh_token (str): Refresh токен из cookie.
        db (Session): Сессия базы данных.
        request_body (dict): Тело запроса с refresh токеном (опционально).
        
    Returns:
        dict: Словарь с новым access_token, token_type и expires_in.
        
    Raises:
        HTTPException: При отсутствии токена, его невалидности или повторном использовании.
    """
    token = refresh_token
    if not token:
        if request_body and isinstance(request_body, dict):
            token = request_body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        user_id, new_plain, new_db = verify_and_rotate_refresh_token(db, token)
    except ReuseDetected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Refresh token reuse detected; all sessions revoked")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    access_token = create_access_token({"sub": str(user_id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    max_age = int((new_db.expires_at - datetime.now(timezone.utc)).total_seconds())
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_plain,
        httponly=True,
        secure=REFRESH_COOKIE_SECURE,
        samesite=REFRESH_COOKIE_SAMESITE,
        path=REFRESH_COOKIE_PATH,
        max_age=max_age,
    )

    return {"access_token": access_token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60}


@router.post("/logout", summary="Выход из системы")
def logout(response: Response, refresh_token: str = Cookie(None), db: Session = Depends(get_db)):
    """
    Выход из системы с отзывом текущего refresh токена.
    
    Удаляет refresh токен из cookie и отмечает его как отозванный в базе данных.
    
    Args:
        response (Response): Объект ответа FastAPI.
        refresh_token (str): Refresh токен из cookie.
        db (Session): Сессия базы данных.
        
    Returns:
        dict: Словарь с сообщением об успешном выходе.
    """
    if not refresh_token:
        response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
        return {"detail": "Logged out"}

    token_hash = _hash_token_hmac(refresh_token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if db_token:
        db_token.revoked = True
        db.commit()

    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return {"detail": "Logged out"}