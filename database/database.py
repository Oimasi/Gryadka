# -*- coding: utf-8 -*-
"""
Database Configuration
----------------------
Модуль для настройки подключения к базе данных PostgreSQL.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Загрузка переменных окружения
load_dotenv()

# Конфигурация параметров подключения к базе данных
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_SSLMODE = os.getenv("POSTGRES_SSLMODE", "")

# Проверка наличия обязательных переменных окружения
if not all([POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_DB]):
    raise RuntimeError("Database environment variables not set properly")

# Экранирование специальных символов в логине и пароле
user_enc = quote_plus(POSTGRES_USER)
password_enc = quote_plus(POSTGRES_PASSWORD)

# Добавление параметров SSL при необходимости
ssl_suffix = f"?sslmode={POSTGRES_SSLMODE}" if POSTGRES_SSLMODE else ""

# Формирование URL подключения к базе данных
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{user_enc}:{password_enc}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}{ssl_suffix}"
)

# Настройка пула соединений
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
    pool_pre_ping=True,
    echo=False,
)

# Создание фабрики сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для SQLAlchemy моделей
Base = declarative_base()


def get_db():
    """
    Генератор сессии базы данных для использования с FastAPI Depends().
    
    Создает сессию базы данных, предоставляет её для использования,
    затем закрывает при завершении.
    
    Yields:
        Session: Сессия базы данных SQLAlchemy.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()