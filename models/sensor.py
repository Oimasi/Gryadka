# -*- coding: utf-8 -*-
"""
Sensor Models
-------------
SQLAlchemy модели для работы с датчиками и их показаниями.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base
from datetime import datetime

class SensorDevice(Base):
    """
    Модель датчика в базе данных.
    Представляет физическое устройство (ESP32) с уникальным API-ключом.
    """
    __tablename__ = "sensor_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    api_key_hash = Column(String(128), nullable=False, unique=True)
    is_active = Column(Boolean, nullable=False, default=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=False, default=dict, name="metadata")
    
    # Связь с продуктом
    product = relationship("Product", back_populates="sensor_devices")
    # Связь с показаниями
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")

class SensorReading(Base):
    """
    Модель показаний датчика.
    Хранит исторические данные с датчиков с привязкой ко времени.
    """
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("sensor_devices.id", ondelete="CASCADE"), nullable=False, index=True)
    temperature = Column(Numeric(5, 2), nullable=True)  # °C
    ph = Column(Numeric(4, 2), nullable=True)
    salinity = Column(Numeric(6, 2), nullable=True)    # ppm или %
    humidity = Column(Integer, nullable=True)         # %
    raw_data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Связь с датчиком
    device = relationship("SensorDevice", back_populates="readings")
    # product = relationship("Product", back_populates="sensor_devices")