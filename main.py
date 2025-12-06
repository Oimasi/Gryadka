# -*- coding: utf-8 -*-
"""
Gryadka API
-----------
REST API для управления пользователями и фермами на FastAPI.
"""

import os
import logging
from datetime import timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from database.database import SessionLocal, engine, get_db, Base
from models import user as user_model, farm as farm_model
from schemas import user as user_schema, farm as farm_schema
from schemas.login import LoginRequest
from utils.security import hash_password, verify_password
from utils.auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from routers import auth as auth_router
from routers import products as products_router
from routers import farms as farms_router  
from routers import sensors as sensors_router
from sqlalchemy.orm import relationship
from fastapi.middleware.cors import CORSMiddleware





# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

app = FastAPI(title="Gryadka API")

# Подключение роутера аутентификации
app.include_router(auth_router.router)
app.include_router(sensors_router.router)
app.include_router(farms_router.router)
app.include_router(products_router.router)
if os.getenv("SKIP_CREATE_ALL", "false").lower() != "true":
    # Создание таблиц в базе данных для разработки
    Base.metadata.create_all(bind=engine)

    
origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",   
    "http://127.0.0.1:5173",
    "https://gryadka.tech",    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """
    Проверка работоспособности API.
    
    Returns:
        dict: Статус ответа.
    """
    return {"status": "ok"}


@app.get("/api/")
def api_root():
    """
    Проверка работоспособности API по пути /api.
    
    Returns:
        dict: Статус ответа.
    """
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=user_schema.User, status_code=201)
def register(user_data: user_schema.UserCreate, db: Session = Depends(get_db)):
    """
    Публичная регистрация пользователя.
    
    Создает нового пользователя, исключая возможность регистрации с ролью 'admin'.
    Возвращает созданного пользователя с кодом 201 при успешном создании.
    
    Args:
        user_data (user_schema.UserCreate): Данные нового пользователя (email, password, first_name, last_name, role).
        db (Session): Сессия базы данных SQLAlchemy.
        
    Returns:
        user_model.User: Объект созданного пользователя.
        
    Raises:
        HTTPException: Если роль пользователя - 'admin' или пользователь с таким email уже существует.
    """
    if user_data.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot register as admin")

    existing = db.query(user_model.User).filter(user_model.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    hashed_pass = hash_password(user_data.password)
    db_user = user_model.User(
        email=user_data.email,
        hashed_password=hashed_pass,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        middle_name=user_data.middle_name,
        role=user_data.role,
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except IntegrityError as exc:
        db.rollback()
        logger.exception("IntegrityError on register: %s", exc)
        raise HTTPException(status_code=409, detail="User with this email already exists")
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected DB error during register: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return db_user



@app.post(
    "/api/auth/login",
    summary="Login (form / json / query)",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string", "example": "test.exemple@mail.ru"},
                            "password": {"type": "string", "example": "ABCabc.123321"},
                        },
                        "required": ["email", "password"],
                    }
                },
                "application/x-www-form-urlencoded": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string", "example": "test.exemple@mail.ru"},
                            "password": {"type": "string", "example": "ABCabc.123321"},
                        },
                        "required": ["email", "password"],
                    }
                },
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "password": {"type": "string"},
                        },
                        "required": ["email", "password"],
                    }
                },
            },
        }
    },
)
async def login(
    request: Request,
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Аутентификация пользователя.

    Поддерживает:
      - form-data / application/x-www-form-urlencoded (поля email, password) — видно в Swagger UI,
      - application/json (тело: {"email": "...", "password": "..."}),
      - multipart/form-data,
      - query-параметры (?email=...&password=...).

    Возвращает: {"access_token": "<jwt>", "token_type": "bearer"}.

    Ошибки:
      - 422 если отсутствуют email/password,
      - 401 если неверные учетные данные,
      - 403 если аккаунт отключен.
    """
    # 1) Если форма (Form) уже дала значения — используем их.
    email_val = email
    password_val = password

    # Заголовок content-type (включая возможный ;charset=utf-8)
    content_type = (request.headers.get("content-type") or "").lower()

    # 2) Попробуем JSON, только если не хватает данных из формы
    if (not email_val or not password_val) and content_type.startswith("application/json"):
        try:
            body = await request.json()
            if isinstance(body, dict):
                email_val = email_val or body.get("email")
                password_val = password_val or body.get("password")
        except Exception:
            # если не удалось распарсить JSON — просто игнорируем и продолжим
            pass

    # 3) Если всё ещё не хватает — попробуем явно прочитать form (поддержка email_form и password_form)
    if (not email_val or not password_val) and ("application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type):
        try:
            form = await request.form()
            # form может содержать другие имена (alias), поэтому проверим несколько вариантов
            form_dict = dict(form)
            email_val = email_val or form_dict.get("email") or form_dict.get("email_form")
            password_val = password_val or form_dict.get("password") or form_dict.get("password_form")
        except Exception:
            pass

    # 4) Последний шанс — query-параметры
    if not email_val or not password_val:
        q = request.query_params
        email_val = email_val or q.get("email") or q.get("email_form")
        password_val = password_val or q.get("password") or q.get("password_form")

    # 5) Если всё ещё нет — ошибка 422
    if not email_val or not password_val:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing email or password (send JSON body or form fields or query params)."
        )

    # 6) Аутентификация в БД
    db_user = db.query(user_model.User).filter(user_model.User.email == email_val).first()
    if not db_user or not verify_password(password_val, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not db_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    # 7) Генерация токена
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id), "role": db_user.role}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/users/", response_model=user_schema.User, status_code=201)
def create_user(user_data: user_schema.UserCreate,
                current_user: user_model.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """
    Создание пользователя администратором.
    
    Только пользователи с ролью 'admin' могут создавать новых пользователей.
    Публичная регистрация доступна по отдельному маршруту.
    
    Args:
        user_data (user_schema.UserCreate): Данные нового пользователя.
        current_user (user_model.User): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных SQLAlchemy.
        
    Returns:
        user_model.User: Объект созданного пользователя.
        
    Raises:
        HTTPException: Если у текущего пользователя нет прав администратора или если пытается создать администратора.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if user_data.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create admin users here")

    hashed_pass = hash_password(user_data.password)
    db_user = user_model.User(
        email=user_data.email,
        hashed_password=hashed_pass,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User with this email already exists")
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected DB error creating user: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return db_user



@app.get("/api/users/me", response_model=user_schema.User)
def read_users_me(current_user: user_model.User = Depends(get_current_user)):
    """
    Получение информации о текущем пользователе.
    
    Возвращает профиль текущего аутентифицированного пользователя.
    
    Args:
        current_user (user_model.User): Текущий аутентифицированный пользователь.
        
    Returns:
        user_model.User: Информация о текущем пользователе.
    """
    return current_user