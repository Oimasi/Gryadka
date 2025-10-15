# -*- coding: utf-8 -*-
"""
User Model
----------
SQLAlchemy модель для представления пользователя в базе данных.
"""

from sqlalchemy import Column, Integer, String, Boolean
from database.database import Base


class User(Base):
    """
    Модель пользователя в базе данных.
    
    Представляет сущность пользователя с основными атрибутами:
    аутентификационные данные, персональная информация и роль.
    
    Attributes:
        id (int): Уникальный идентификатор пользователя (первичный ключ).
        email (str): Адрес электронной почты пользователя (уникальный, до 320 символов).
        hashed_password (str): Хешированный пароль пользователя.
        is_active (bool): Статус активности пользователя (по умолчанию True).
        first_name (str): Имя пользователя (до 100 символов).
        last_name (str): Фамилия пользователя (до 100 символов).
        middle_name (str): Отчество пользователя (до 100 символов, может быть null).
        role (str): Роль пользователя ('consumer', 'farmer', 'admin', по умолчанию 'consumer').
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    role = Column(String(30), default="consumer", nullable=False)

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"