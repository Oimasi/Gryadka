# -*- coding: utf-8 -*-
"""
Security Utilities
------------------
Модуль для безопасного хеширования и проверки паролей.
"""

from passlib.context import CryptContext

# Контекст для хеширования паролей с использованием алгоритма Argon2
# Argon2 обеспечивает высокую степень безопасности и устойчивость к атакам
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Хеширование пароля с использованием алгоритма Argon2.
    
    Args:
        password (str): Исходный пароль в открытом виде.
        
    Returns:
        str: Хешированный пароль в виде строки.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверка соответствия введенного пароля хешированному значению.
    
    Args:
        plain_password (str): Введенный пользователем пароль.
        hashed_password (str): Хешированный пароль из базы данных.
        
    Returns:
        bool: True, если пароль совпадает с хешем, иначе False.
    """
    return pwd_context.verify(plain_password, hashed_password)