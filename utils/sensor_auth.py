# -*- coding: utf-8 -*-
"""
Sensor Authentication Utilities
-------------------------------
Утилиты для аутентификации датчиков по API-ключам.
"""
import hmac
import hashlib
from typing import Optional
from sqlalchemy.orm import Session
from models.sensor import SensorDevice
import os
from datetime import datetime, timezone  


SENSOR_SECRET_KEY = os.getenv("SENSOR_SECRET_KEY")

def hash_api_key(api_key: str) -> str:
    """
    Хеширование API-ключа с использованием HMAC-SHA256.
    Безопасное хранение ключей в базе данных.
    """
    return hmac.new(
        SENSOR_SECRET_KEY.encode('utf-8'),
        api_key.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def verify_sensor_api_key(db: Session, api_key: str) -> Optional[SensorDevice]:
    """
    Верификация API-ключа датчика.
    Возвращает объект датчика, если ключ действителен и датчик активен.
    """
    api_key_hash = hash_api_key(api_key)
    sensor = db.query(SensorDevice).filter(
        SensorDevice.api_key_hash == api_key_hash,
        SensorDevice.is_active == True
    ).first()
    
    if sensor:
        # Обновляем время последнего подключения
        sensor.last_seen = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sensor)
    
    return sensor