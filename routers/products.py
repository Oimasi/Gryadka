# -*- coding: utf-8 -*-

from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Any
import logging
import importlib
from uuid import uuid4
from datetime import datetime
from fastapi import Response
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from database.database import get_db
from models.sensor import SensorDevice
from schemas.sensor import SensorDeviceOut
from models.product import Product, ProductPassport, ProductMedia
from models.farm import Farm
from schemas.product import (
    ProductCreate, ProductOut, ProductUpdate,
    ProductPassportCreate, ProductPassportOut,
    ProductMediaIn, ProductMediaConfirm
)
from models.user import User as UserModel
from utils.auth import get_current_user, get_current_user_optional
from urllib.parse import quote as _urlquote
from utils import ai_recommendation

logger = logging.getLogger("products_router")
router = APIRouter(prefix="/api/products", tags=["products"])

media_db = importlib.import_module('utils.media_db')

def _require_farmer_or_admin(user: UserModel):
    """
    Проверяет, является ли пользователь farmer или admin.
    
    Args:
        user (UserModel): Пользователь для проверки.
        
    Raises:
        HTTPException: Если у пользователя недостаточно прав.
    """
    if getattr(user, "role", None) not in ("farmer", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _require_owner_or_admin(user: UserModel, product: Product):
    """
    Проверяет, является ли пользователь владельцем продукта или admin.
    
    Args:
        user (UserModel): Пользователь для проверки.
        product (Product): Продукт для проверки.
        
    Raises:
        HTTPException: Если пользователь не является владельцем или администратором.
    """
    if getattr(user, "role", None) == "farmer" and product.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")

def _parse_date_maybe(val: Optional[Any]) -> Optional[datetime.date]:
    """
    Парсит дату из строки или возвращает как есть.
    
    Args:
        val (Optional[Any]): Значение для парсинга.
        
    Returns:
        Optional[datetime.date]: Объект даты или None.
    """
    if not val:
        return None
    if isinstance(val, (datetime,)):
        return val.date()
    if isinstance(val, str):
        s = val.strip()
        
        try:
            dt = datetime.fromisoformat(s)
            return dt.date()
        except Exception:
            pass
       
        try:
            parts = s.split(".")
            if len(parts) == 3:
                day = int(parts[0])
                month = int(parts[1])
                year = int(parts[2])
                return datetime(year=year, month=month, day=day).date()
        except Exception:
            pass
    return None


def _coerce_empty_to_none(value):
    """
    Преобразует пустые строки в None.
    
    Args:
        value: Значение для преобразования.
        
    Returns:
        Значение, преобразованное в None если оно было пустой строкой.
    """
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s if s != "" else None
    return value


def _apply_price_markup(raw_price) -> Decimal:
    """
    Прибавляет 15% к цене, округляя до копеек.
    Используем целочисленную арифметику в копейках для избежания погрешностей.
    """
    try:
        base = Decimal(str(raw_price))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid price format")

    if base <= 0:
        raise HTTPException(status_code=400, detail="Price must be positive")

    # Конвертируем в копейки (целое), умножаем на 115, делим на 100 с округлением
    kopecks = int((base * 100).to_integral_value(rounding=ROUND_HALF_UP))
    marked_up_kopecks = (kopecks * 115 + 50) // 100  # +50 для округления к ближайшему
    return Decimal(marked_up_kopecks) / Decimal(100)


@router.get("/me", response_model=List[ProductOut])
def my_products(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Получение списка продуктов текущего пользователя.
    
    Args:
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
        
    Returns:
        List[ProductOut]: Список продуктов пользователя.
    """
    query = db.query(Product).options(joinedload(Product.media), joinedload(Product.farm)).filter(Product.owner_id == current_user.id)
    products = query.order_by(Product.created_at.desc()).all()
    for p in products:
        for m in p.media:
            if m.is_primary:
                try:
                    m.presigned_url = media_db.public_media_url(m.id)
                except Exception:
                    m.presigned_url = None
        p.farm_name = p.farm.name if p.farm else None
    return products

@router.post("/", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Создание нового продукта с опциональным паспортом.
    Логирует входящий payload для отладки.
    
    Args:
        payload (ProductCreate): Данные для создания продукта.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
        
    Returns:
        ProductOut: Созданный продукт.
    """
    
    try:
        logger.info("create_product called by user=%s payload=%s", getattr(current_user, "id", None), getattr(payload, "dict", lambda: {})())
    except Exception:
        logger.info("create_product called — failed to stringify payload")

    _require_farmer_or_admin(current_user)

    final_farm_id = None
    farm_obj = None
    if getattr(payload, "farm_id", None) is not None:
        farm_obj = db.query(Farm).filter(Farm.id == payload.farm_id).first()
        if not farm_obj:
            raise HTTPException(status_code=400, detail="Farm not found")
        if farm_obj.owner_id != current_user.id and getattr(current_user, "role", None) != "admin":
            raise HTTPException(status_code=403, detail="Cannot create product for this farm")
        final_farm_id = payload.farm_id

    # Применяем наценку 15% перед сохранением
    final_price = _apply_price_markup(payload.price)

    product = Product(
        name=payload.name,
        short_description=getattr(payload, "short_description", "") or "",
        price=final_price,
        category=payload.category,
        owner_id=current_user.id,
        farm_id=final_farm_id,
        is_active=bool(getattr(payload, "is_active", True)),
        is_growing=bool(getattr(payload, "is_growing", False)),
        is_halal=bool(getattr(payload, "is_halal", False)),
        is_lenten=bool(getattr(payload, "is_lenten", False)),
    )
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create product: %s", exc)
        raise HTTPException(status_code=500, detail="Database error on create")
    
    if hasattr(payload, "sensor_id") and payload.sensor_id is not None:
        try:
            sensor = db.query(SensorDevice).filter(SensorDevice.id == payload.sensor_id).first()
            if sensor:
                sensor.product_id = product.id
                db.commit()
                db.refresh(sensor)
                logger.info(f"Sensor {sensor.id} successfully assigned to product {product.id}")
            else:
                logger.warning(f"Sensor with ID {payload.sensor_id} not found for product {product.id}")
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to assign sensor to product: %s", exc)

    passport_payload = getattr(payload, "passport", None)
    if passport_payload is not None:
        try:
           
            if isinstance(passport_payload, dict):
                origin_raw = passport_payload.get("origin")
                variety_raw = passport_payload.get("variety")
                harvest_raw = passport_payload.get("harvest_date")
                certifications = passport_payload.get("certifications") or []
                data = passport_payload.get("data") or {}
            else:
                origin_raw = getattr(passport_payload, "origin", None)
                variety_raw = getattr(passport_payload, "variety", None)
                harvest_raw = getattr(passport_payload, "harvest_date", None)
                certifications = getattr(passport_payload, "certifications", []) or []
                data = getattr(passport_payload, "data", {}) or {}

            origin = _coerce_empty_to_none(origin_raw)
            variety = _coerce_empty_to_none(variety_raw)
            harvest_date = _parse_date_maybe(harvest_raw)

            
            passport = db.query(ProductPassport).filter(ProductPassport.product_id == product.id).first()
            if passport:
                passport.origin = origin
                passport.variety = variety
                passport.harvest_date = harvest_date
                passport.certifications = certifications
                passport.data = data
                db.add(passport)
            else:
                passport = ProductPassport(
                    product_id=product.id,
                    origin=origin,
                    variety=variety,
                    harvest_date=harvest_date,
                    certifications=certifications,
                    data=data
                )
                db.add(passport)

            try:
                db.commit()
                db.refresh(passport)
            except Exception:
                db.rollback()
                logger.exception("Failed to commit passport for product %s", product.id)
        except Exception as exc:
            logger.exception("Error processing passport payload for product %s: %s", product.id, exc)

    # Генерация ИИ рекомендации для собранных товаров
    if not product.is_growing:
        try:
            # Получаем паспорт, если он был создан
            passport = db.query(ProductPassport).filter(ProductPassport.product_id == product.id).first()
            
            # Если рекомендация еще не была сгенерирована
            if passport and passport.data:
                existing_recommendation = passport.data.get("Краткая рекомендация от ИИ")
                if not existing_recommendation or existing_recommendation.strip() == "":
                    # Формируем данные паспорта для генерации
                    passport_data = {
                        "origin": passport.origin,
                        "variety": passport.variety,
                        "harvest_date": passport.harvest_date.isoformat() if passport.harvest_date else None,
                        "certifications": passport.certifications or [],
                        "data": passport.data or {}
                    }
                    
                    # Генерируем рекомендацию
                    recommendation = ai_recommendation.generate_product_recommendation(
                        product_name=product.name,
                        product_category=product.category or "",
                        short_description=product.short_description or "",
                        passport_data=passport_data
                    )
                    
                    if recommendation:
                        # Обновляем паспорт с новой рекомендацией
                        passport_data_update = passport.data.copy()
                        passport_data_update["Краткая рекомендация от ИИ"] = recommendation
                        passport.data = passport_data_update
                        db.add(passport)
                        try:
                            db.commit()
                            db.refresh(passport)
                            logger.info(f"Successfully generated AI recommendation for product {product.id}")
                        except Exception as exc:
                            db.rollback()
                            logger.exception(f"Failed to save AI recommendation for product {product.id}: {exc}")
                    else:
                        logger.warning(f"Failed to generate AI recommendation for product {product.id}")
        except Exception as exc:
            logger.exception(f"Error generating AI recommendation for product {product.id}: {exc}")
    
    for m in getattr(product, "media", []) or []:
        if m.is_primary:
            try:
                m.presigned_url = media_db.public_media_url(m.id)
            except Exception:
                m.presigned_url = None

    if final_farm_id and not farm_obj:
        farm_obj = db.query(Farm).filter(Farm.id == final_farm_id).first()
    product.farm_name = farm_obj.name if farm_obj else None

    # После создания продукта
    if payload.sensor_id:
        sensor = db.query(SensorDevice).filter(SensorDevice.id == payload.sensor_id).first()
        if sensor:
            sensor.product_id = product.id
            db.commit()
            db.refresh(sensor)
    
    try:
        db.refresh(product)
        db.refresh(product.sensor_devices)
    except Exception:
        pass

    return product


@router.get("/", response_model=List[ProductOut])
def list_products(q: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """
    Получение списка продуктов с опциональным поиском.
    
    Args:
        q (Optional[str]): Поисковый запрос.
        limit (int): Ограничение на количество результатов.
        offset (int): Смещение для пагинации.
        db (Session): Сессия базы данных.
        
    Returns:
        List[ProductOut]: Список продуктов.
    """
    query = db.query(Product).options(joinedload(Product.media), joinedload(Product.farm)).filter(Product.is_active == True)
    if q:
        ilike = f"%{q}%"
        query = query.filter((Product.name.ilike(ilike)) | (Product.short_description.ilike(ilike)))
    products = query.order_by(Product.created_at.desc()).limit(min(limit, 200)).offset(max(offset, 0)).all()

    for p in products:
        for m in p.media:
            if m.is_primary:
                try:
                    m.presigned_url = media_db.public_media_url(m.id)
                except Exception:
                    m.presigned_url = None
        p.farm_name = p.farm.name if p.farm else None
    return products


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Получение конкретного продукта по ID.
    
    Args:
        product_id (int): ID продукта.
        db (Session): Сессия базы данных.
        
    Returns:
        ProductOut: Данные продукта.
    """
    product = db.query(Product).options(
        joinedload(Product.media), 
        joinedload(Product.farm),
        joinedload(Product.sensor_devices)  
    ).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for m in product.media:
        try:
            m.presigned_url = media_db.public_media_url(m.id)
        except Exception:
            m.presigned_url = None
    product.farm_name = product.farm.name if product.farm else None
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Обновление продукта.
    
    Args:
        product_id (int): ID продукта для обновления.
        payload (ProductUpdate): Данные для обновления.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
        
    Returns:
        ProductOut: Обновленный продукт.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if current_user.role == "consumer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    if current_user.role == "farmer" and product.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify product you don't own")

    if payload.farm_id is not None:
        new_farm = db.query(Farm).filter(Farm.id == payload.farm_id).first()
        if not new_farm:
            raise HTTPException(status_code=400, detail="Farm not found")
        if new_farm.owner_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Cannot assign product to this farm")
        product.farm_id = payload.farm_id

    changed = False
    for field, value in payload.dict(exclude_unset=True).items():
        if field == "owner_id":
            continue
        if field == "price":
            if value is None:
                continue
            value = _apply_price_markup(value)
        setattr(product, field, value)
        changed = True
        
    if hasattr(payload, "is_growing") and payload.is_growing is not None:
        product.is_growing = bool(payload.is_growing)
        changed = True

    if changed:
        try:
            db.commit()
            db.refresh(product)
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to update product %s: %s", product_id, exc)
            raise HTTPException(status_code=500, detail="Database error on update")

    for m in product.media:
        try:
            m.presigned_url = media_db.public_media_url(m.id)
        except Exception:
            m.presigned_url = None
    product.farm_name = product.farm.name if product.farm else None
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Удаление продукта.
    
    Args:
        product_id (int): ID продукта для удаления.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _require_owner_or_admin(current_user, product)

    try:
        db.delete(product)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete product %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete product")
    return {}



@router.get("/{product_id}/passport", response_model=ProductPassportOut)
def get_passport(product_id: int, db: Session = Depends(get_db)):
    """
    Получение паспорта продукта.
    
    Args:
        product_id (int): ID продукта.
        db (Session): Сессия базы данных.
        
    Returns:
        ProductPassportOut: Данные паспорта.
    """
    passport = db.query(ProductPassport).filter(ProductPassport.product_id == product_id).first()
    if not passport:
        raise HTTPException(status_code=404, detail="Passport not found")
    return passport
@router.post("/{product_id}/passport", response_model=ProductPassportOut, status_code=201)
def upsert_passport(product_id: int, payload: ProductPassportCreate = Body(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Создание или обновление паспорта продукта.
    Требует права владельца или администратора.
    
    Args:
        product_id (int): ID продукта.
        payload (ProductPassportCreate): Данные паспорта.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
        
    Returns:
        ProductPassportOut: Созданный или обновленный паспорт.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.owner_id != int(current_user.id) and not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not allowed to modify passport for this product")

    
    origin = getattr(payload, "origin", None)
    variety = getattr(payload, "variety", None)
    harvest_date = _parse_date_maybe(getattr(payload, "harvest_date", None))
    certifications = getattr(payload, "certifications", []) or []
    data = getattr(payload, "data", {}) or {}

    passport = db.query(ProductPassport).filter(ProductPassport.product_id == product_id).first()
    if passport:
        passport.origin = origin
        passport.variety = variety
        passport.harvest_date = harvest_date
        passport.certifications = certifications
        passport.data = data
        try:
            db.commit()
            db.refresh(passport)
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to update passport for product %s: %s", product_id, exc)
            raise HTTPException(status_code=500, detail="Failed to update passport")
        
        # Генерация ИИ рекомендации для собранных товаров
        if not product.is_growing:
            try:
                existing_recommendation = passport.data.get("Краткая рекомендация от ИИ") if passport.data else None
                if not existing_recommendation or existing_recommendation.strip() == "":
                    passport_data_for_ai = {
                        "origin": passport.origin,
                        "variety": passport.variety,
                        "harvest_date": passport.harvest_date.isoformat() if passport.harvest_date else None,
                        "certifications": passport.certifications or [],
                        "data": passport.data or {}
                    }
                    
                    recommendation = ai_recommendation.generate_product_recommendation(
                        product_name=product.name,
                        product_category=product.category or "",
                        short_description=product.short_description or "",
                        passport_data=passport_data_for_ai
                    )
                    
                    if recommendation:
                        passport_data_update = passport.data.copy() if passport.data else {}
                        passport_data_update["Краткая рекомендация от ИИ"] = recommendation
                        passport.data = passport_data_update
                        db.add(passport)
                        try:
                            db.commit()
                            db.refresh(passport)
                            logger.info(f"Successfully generated AI recommendation for product {product_id}")
                        except Exception as exc:
                            db.rollback()
                            logger.exception(f"Failed to save AI recommendation for product {product_id}: {exc}")
                    else:
                        logger.warning(f"Failed to generate AI recommendation for product {product_id}")
            except Exception as exc:
                logger.exception(f"Error generating AI recommendation for product {product_id}: {exc}")
        
        return passport

    
    passport = ProductPassport(product_id=product_id, origin=origin, variety=variety, harvest_date=harvest_date, certifications=certifications, data=data)
    db.add(passport)
    try:
        db.commit()
        db.refresh(passport)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create passport for product %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail="Failed to create passport")
    
    # Генерация ИИ рекомендации для собранных товаров после создания паспорта
    if not product.is_growing:
        try:
            existing_recommendation = passport.data.get("Краткая рекомендация от ИИ") if passport.data else None
            if not existing_recommendation or existing_recommendation.strip() == "":
                passport_data_for_ai = {
                    "origin": passport.origin,
                    "variety": passport.variety,
                    "harvest_date": passport.harvest_date.isoformat() if passport.harvest_date else None,
                    "certifications": passport.certifications or [],
                    "data": passport.data or {}
                }
                
                recommendation = ai_recommendation.generate_product_recommendation(
                    product_name=product.name,
                    product_category=product.category or "",
                    short_description=product.short_description or "",
                    passport_data=passport_data_for_ai
                )
                
                if recommendation:
                    passport_data_update = passport.data.copy() if passport.data else {}
                    passport_data_update["Краткая рекомендация от ИИ"] = recommendation
                    passport.data = passport_data_update
                    db.add(passport)
                    try:
                        db.commit()
                        db.refresh(passport)
                        logger.info(f"Successfully generated AI recommendation for product {product_id}")
                    except Exception as exc:
                        db.rollback()
                        logger.exception(f"Failed to save AI recommendation for product {product_id}: {exc}")
                else:
                    logger.warning(f"Failed to generate AI recommendation for product {product_id}")
        except Exception as exc:
            logger.exception(f"Error generating AI recommendation for product {product_id}: {exc}")
    
    return passport



@router.post("/{product_id}/media/presign")
def presign_media(product_id: int, payload: ProductMediaIn, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """
    Создание заглушки staged и возврат object_key/upload_url.
    
    Args:
        product_id (int): ID продукта.
        payload (ProductMediaIn): Данные медиафайла.
        db (Session): Сессия базы данных.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        
    Returns:
        dict: Словарь с object_key и upload_url.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.owner_id != int(current_user.id) and not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not allowed to presign for this product")

    filename = payload.filename or "upload.bin"
    object_key = media_db.gen_object_key(product_id=product_id, filename=filename)
    media_db.create_staged_placeholder(db=db, object_key=object_key, product_id=product_id, filename=filename, mime_type=getattr(payload, "mime_type", "application/octet-stream"))
    upload_url = getattr(payload, "upload_url", None) or f"/api/products/{product_id}/media/upload?object_key={object_key}"
    return {"object_key": object_key, "upload_url": upload_url}


@router.api_route("/{product_id}/media/upload", methods=["POST", "PUT"])
async def upload_media(
    product_id: int,
    request: Request,
    file: UploadFile | None = File(None),
    object_key: str | None = Query(None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Поддержка multipart form upload или raw body; сохраняет staged upload.
    
    Args:
        product_id (int): ID продукта.
        request (Request): Запрос FastAPI.
        file (UploadFile | None): Загружаемый файл.
        object_key (str | None): Ключ объекта.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
        
    Returns:
        JSONResponse: Ответ с object_key.
    """
    try:
        
        if file is not None:
            data = await file.read()
            filename = file.filename or "upload"
            mime = file.content_type or "application/octet-stream"
        else:
            content_type = request.headers.get("content-type", "")
            if "multipart/form-data" in content_type:
                form = await request.form()
                f = form.get("file")
                if f is None:
                    raise HTTPException(status_code=400, detail="file field is required")
                data = await f.read()
                filename = getattr(f, "filename", "upload")
                mime = getattr(f, "content_type", "application/octet-stream")
            else:
                data = await request.body()
                if not data:
                    raise HTTPException(status_code=400, detail="empty body")
                if not object_key:
                    raise HTTPException(status_code=400, detail="object_key query param required for raw upload")
                filename = object_key.split("/")[-1]
                mime = content_type or "application/octet-stream"

        if not object_key:
            try:
                object_key = media_db.gen_object_key(product_id=product_id, filename=filename)
            except Exception:
                object_key = f"{product_id}/{uuid4().hex}_{filename}"

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.owner_id != int(current_user.id) and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not allowed to upload for this product")

        if not data:
            raise HTTPException(status_code=400, detail="Empty upload")

        staged = media_db.store_staged_upload(db=db, object_key=object_key, product_id=product_id, filename=filename, content=data, mime_type=mime)
        return JSONResponse({"object_key": object_key}, status_code=200)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Upload failed for product %s, object_key=%s: %s", product_id, object_key, exc)
        raise HTTPException(status_code=500, detail="Failed to store upload")


@router.post("/{product_id}/media/confirm", status_code=201)
def confirm_media_upload(product_id: int, payload: ProductMediaConfirm = Body(...), db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """
    Подтверждение staged upload -> создание записи ProductMedia.
    
    Args:
        product_id (int): ID продукта.
        payload (ProductMediaConfirm): Данные подтверждения.
        db (Session): Сессия базы данных.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        
    Returns:
        dict: Данные созданного медиа.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.owner_id != int(current_user.id) and not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not allowed to confirm media for this product")

    object_key = getattr(payload, "object_key", None)
    if not object_key:
        raise HTTPException(status_code=400, detail="object_key required")

    staged = media_db.get_staged_by_object_key(db=db, object_key=object_key)
    if staged is None:
        raise HTTPException(status_code=404, detail="staged upload not found")
    if int(staged.product_id) != int(product_id):
        raise HTTPException(status_code=400, detail="object_key does not belong to the given product")

    try:
        media = media_db.create_media_from_staged(db=db, object_key=object_key, is_primary=bool(getattr(payload, "is_primary", False)), meta=(getattr(payload, "meta", {}) or {}), mime_type=getattr(payload, "mime_type", None))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail="DB integrity error creating media")
    except Exception as e:
        logger.exception("Failed to create media from staged: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create media")

    out = {
        "id": media.id,
        "product_id": media.product_id,
        "filename": media.filename,
        "mime_type": media.mime_type,
        "is_primary": media.is_primary,
        "meta": media.meta,
        "created_at": media.created_at.isoformat() if hasattr(media, "created_at") else None,
    }
    return out


@router.delete("/{product_id}/media/{media_id}", status_code=204)
def delete_media(product_id: int, media_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Удаление медиафайла.
    
    Args:
        product_id (int): ID продукта.
        media_id (int): ID медиафайла.
        current_user (UserModel): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных.
    """
    media = db.query(ProductMedia).filter(ProductMedia.id == media_id, ProductMedia.product_id == product_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    product = db.query(Product).filter(Product.id == product_id).first()
    _require_owner_or_admin(current_user, product)

    try:
        db.delete(media)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete media record %s: %s", media_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete media")
    return {}

@router.get("/media/{media_id}/file")
def serve_media_file(media_id: int, db: Session = Depends(get_db), current_user: Optional[UserModel] = Depends(get_current_user_optional)):
    """
    Обслуживание медиафайла.
    
    Args:
        media_id (int): ID медиафайла.
        db (Session): Сессия базы данных.
        current_user (Optional[UserModel]): Текущий аутентифицированный пользователь.
        
    Returns:
        Response: Ответ с содержимым файла.
    """
    media = db.query(ProductMedia).filter(ProductMedia.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    product = db.query(Product).filter(Product.id == media.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Публичный продукт — доступен без авторизации
    if not getattr(product, "is_active", False):
        if not current_user:
            raise HTTPException(status_code=403, detail="Forbidden")
        if current_user.role != "admin" and current_user.id != product.owner_id:
            raise HTTPException(status_code=403, detail="Forbidden")

    content = getattr(media, "content", b"") or b""
    try:
        if isinstance(content, memoryview):
            content_bytes = content.tobytes()
        elif isinstance(content, bytearray):
            content_bytes = bytes(content)
        elif isinstance(content, str):
            content_bytes = content.encode("utf-8")
        else:
            content_bytes = content
    except Exception:
        logger.exception("Failed to coerce media.content to bytes for media_id=%s", media_id)
        content_bytes = b""

    media_type = media.mime_type or "application/octet-stream"
    filename = getattr(media, "filename", "file")

    if filename is None:
        filename = "file"
    if isinstance(filename, bytes):
        try:
            filename = filename.decode("utf-8")
        except Exception:
            filename = filename.decode("latin-1", "ignore")

    # ascii fallback — удаляем символы вне ASCII; если пусто, используем "file"
    ascii_filename = (filename.encode("ascii", "ignore").decode("ascii") or "file")

    # percent-encode UTF-8 имя для filename* (RFC 5987)
    quoted_filename = _urlquote(filename, safe="")

    # Формируем Content-Disposition: ASCII-fallback + filename* (UTF-8)
    content_disp = f'inline; filename="{ascii_filename}"; filename*=UTF-8\'\'{quoted_filename}'

    return Response(content=content_bytes, media_type=media_type, headers={"Content-Disposition": content_disp})
