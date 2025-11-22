# -*- coding: utf-8 -*-
"""
Sensors Router
--------------
API для работы с датчиками и их показаниями.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import logging
from datetime import datetime, timedelta

from database.database import get_db
from models.sensor import SensorDevice, SensorReading
from schemas.sensor import (
    SensorReadingCreate, 
    SensorReadingOut,
    SensorDeviceCreate,
    SensorDeviceOut
)
from utils.sensor_auth import verify_sensor_api_key, hash_api_key
from utils.auth import get_current_user
from models.user import User as UserModel

logger = logging.getLogger("sensors_router")
router = APIRouter(prefix="/api/sensors", tags=["sensors"])

# Rate limiting: не чаще чем раз в 10 минут для одного датчика
MIN_READING_INTERVAL = timedelta(minutes=10)

@router.post("/readings", response_model=SensorReadingOut, status_code=201)
def create_sensor_reading(
    payload: SensorReadingCreate,
    db: Session = Depends(get_db)
):
    """
    Прием показаний от датчика.
    Аутентификация по API-ключу в теле запроса.
    Rate limiting: не чаще чем раз в 10 минут.
    """
    # 1. Аутентификация датчика
    sensor = verify_sensor_api_key(db, payload.api_key)
    if not sensor:
        logger.warning("Invalid API key attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sensor API key"
        )
    
    # 2. Проверка rate limiting
    last_reading = db.query(SensorReading).filter(
        SensorReading.device_id == sensor.id
    ).order_by(SensorReading.created_at.desc()).first()
    
    if last_reading and (datetime.utcnow() - last_reading.created_at) < MIN_READING_INTERVAL:
        logger.warning(f"Rate limit exceeded for sensor {sensor.id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Readings can be submitted no more than once every {MIN_READING_INTERVAL.total_seconds()//60} minutes"
        )
    
    # 3. Валидация данных. Я делмаю это в бд, но лучше отловить тут на всякий
    if payload.temperature is not None and not (-50 <= payload.temperature <= 100):
        raise HTTPException(status_code=400, detail="Invalid temperature value")
    
    if payload.ph is not None and not (0 <= payload.ph <= 14):
        raise HTTPException(status_code=400, detail="Invalid pH value")
    
    # 4. Создание записи
    reading = SensorReading(
        device_id=sensor.id,
        temperature=payload.temperature,
        ph=payload.ph,
        salinity=payload.salinity,
        humidity=payload.humidity,
        raw_data=payload.raw_data
    )
    
    db.add(reading)
    try:
        db.commit()
        db.refresh(reading)
    except Exception as exc:
        db.rollback()
        logger.exception("Database error creating sensor reading: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save sensor reading"
        )
    
    logger.info(f"Sensor reading saved for device {sensor.id}")
    return reading

@router.post("/devices", response_model=SensorDeviceOut, status_code=201)
def register_sensor_device(
    payload: SensorDeviceCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Регистрация нового датчика (только для админов и фермеров).
    Генерирует уникальный API-ключ для датчика.
    """
    # Проверка прав доступа
    if current_user.role not in ["admin", "farmer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and farmers can register sensors"
        )
    
    # Проверка существования продукта (если указан)
    if payload.product_id:
        from models.product import Product
        product = db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Проверка прав на продукт для фермеров
        if current_user.role == "farmer" and product.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only register sensors for your own products"
            )
    
    # Генерация уникального API-ключа
    import secrets
    api_key = f"sensor_{secrets.token_urlsafe(32)}"
    api_key_hash = hash_api_key(api_key)
    
    # Создание датчика
    sensor = SensorDevice(
        name=payload.name,
        api_key_hash=api_key_hash,
        product_id=payload.product_id,
        is_active=True
    )
    
    db.add(sensor)
    try:
        db.commit()
        db.refresh(sensor)
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Integrity error creating sensor: %s", exc)
        raise HTTPException(status_code=400, detail="Sensor with this name already exists")
    except Exception as exc:
        db.rollback()
        logger.exception("Database error creating sensor: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create sensor")
    
    # Возвращаем ответ с API-ключом (только в этом ответе!)
    response_data = SensorDeviceOut.model_validate(sensor)
    return {**response_data.model_dump(), "api_key": api_key}

@router.get("/devices", response_model=List[SensorDeviceOut])
def list_sensor_devices(
    product_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Список датчиков (только для админов и фермеров).
    Можно фильтровать по product_id.
    """
    if current_user.role not in ["admin", "farmer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and farmers can view sensors"
        )
    
    query = db.query(SensorDevice)
    
    # Фильтрация по продукту
    if product_id:
        from models.product import Product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if current_user.role == "farmer" and product.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view sensors for your own products"
            )
        
        query = query.filter(SensorDevice.product_id == product_id)
    
    # Для фермеров - только их датчики
    if current_user.role == "farmer":
        from models.product import Product
        farmer_products = db.query(Product.id).filter(Product.owner_id == current_user.id).subquery()
        query = query.filter(SensorDevice.product_id.in_(farmer_products))
    
    sensors = query.order_by(SensorDevice.created_at.desc()).all()
    return sensors

@router.get("/devices/{device_id}", response_model=SensorDeviceOut)
def get_sensor_device(
    device_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации о конкретном датчике.
    """
    if current_user.role not in ["admin", "farmer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and farmers can view sensor details"
        )
    
    sensor = db.query(SensorDevice).filter(SensorDevice.id == device_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    # Проверка прав доступа для фермеров
    if current_user.role == "farmer":
        if sensor.product and sensor.product.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view sensors for your own products"
            )
    
    return sensor

@router.put("/devices/{device_id}/toggle", response_model=SensorDeviceOut)
def toggle_sensor_device(
    device_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Активация/деактивация датчика (только для админов).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can toggle sensors"
        )
    
    sensor = db.query(SensorDevice).filter(SensorDevice.id == device_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    sensor.is_active = not sensor.is_active
    db.commit()
    db.refresh(sensor)
    return sensor

@router.get("/devices/{device_id}/readings", response_model=List[SensorReadingOut])
def get_sensor_readings(
    device_id: int,
    limit: int = 100,
    hours: Optional[int] = 24,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение показаний датчика за указанный период.
    """
    if current_user.role not in ["admin", "farmer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and farmers can view sensor readings"
        )
    
    sensor = db.query(SensorDevice).filter(SensorDevice.id == device_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    # Проверка прав доступа для фермеров
    if current_user.role == "farmer":
        if sensor.product and sensor.product.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view readings for your own sensors"
            )
    
    # Фильтрация по времени
    query = db.query(SensorReading).filter(SensorReading.device_id == device_id)
    
    if hours:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(SensorReading.created_at >= since)
    
    readings = query.order_by(SensorReading.created_at.desc()).limit(limit).all()
    return readings


@router.post("/devices/{device_id}/assign-product/{product_id}")
def assign_sensor_to_product(
    device_id: int,
    product_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверка прав (только админ или владелец продукта)
    # Логика привязки датчика к продукту
    sensor.product_id = product_id
    db.commit()
    return {"status": "success"}