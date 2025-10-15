# -*- coding: utf-8 -*-
"""
Роутер для управления товарами, паспортами и медиа.
- Фермер (role == "farmer") может CRUD для своих товаров.
- Admin может CRUD для любых товаров.
- Consumer (role == "consumer") — только чтение.
- Все входные данные строго валидируются Pydantic'ом.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import uuid
import logging

from database.database import get_db
from models.product import Product, ProductPassport, ProductMedia
from schemas.product import (
    ProductCreate, ProductOut, ProductUpdate,
    ProductPassportCreate, ProductPassportOut,
    ProductMediaIn, ProductMediaConfirm, ProductMediaOut
)
from models.user import User as UserModel
from utils.auth import get_current_user
from utils.minio_client import ensure_bucket_exists, presigned_put_object, presigned_get_object, remove_object

logger = logging.getLogger("products_router")
router = APIRouter(prefix="/api/products", tags=["products"])

@router.on_event("startup")
def _startup():
    # Убедимся, что бакет существует при старте
    ensure_bucket_exists()

def _require_farmer_or_admin(user: UserModel):
    if user.role not in ("farmer", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

def _require_owner_or_admin(user: UserModel, product: Product):
    if user.role == "farmer" and product.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")

# -------------------- Products CRUD -----------------------------------------
@router.post("/", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate,
                   current_user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """
    Создание продукта.
    - farmer создает продукт для себя;
    - admin может указывать owner_id (в этом API — создаём от имени current_user).
    """
    _require_farmer_or_admin(current_user)
    product = Product(name=payload.name, short_description=payload.short_description, owner_id=current_user.id)
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create product: %s", exc)
        raise HTTPException(status_code=500, detail="Database error on create")
    # Создаём пустой паспорт (чтобы гарантировать наличие записи)
    passport = ProductPassport(product_id=product.id, data={}, certifications=[])
    db.add(passport)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # не критично — продукт создан; логируем и продолжаем
        logger.exception("Failed to create empty passport for product %s", product.id)
    db.refresh(product)
    return product

@router.get("/", response_model=List[ProductOut])
def list_products(q: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """
    Публичный просмотр каталога:
    - по умолчанию возвращаем только is_active=True
    - простая фильтрация по q по имени/описанию
    - пагинация через limit/offset
    """
    query = db.query(Product).filter(Product.is_active == True)
    if q:
        ilike = f"%{q}%"
        query = query.filter((Product.name.ilike(ilike)) | (Product.short_description.ilike(ilike)))
    products = query.order_by(Product.created_at.desc()).limit(min(limit, 200)).offset(max(offset, 0)).all()
    # добавляем presigned для primary media
    for p in products:
        for m in p.media:
            if m.is_primary:
                try:
                    m.presigned_url = presigned_get_object(m.object_key, expires_minutes=60)
                except Exception:
                    m.presigned_url = None
    return products

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Получить продукт по id (публично) — только активные продукты.
    """
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # выдаём presigned URL для всех медиа (или только primary по желанию)
    for m in product.media:
        try:
            m.presigned_url = presigned_get_object(m.object_key, expires_minutes=60)
        except Exception:
            m.presigned_url = None
    return product
@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Обновление товара.
    - Только аутентифицированные пользователи.
    - admin может обновлять любые товары.
    - farmer может обновлять только свои товары (product.owner_id == current_user.id).
    - consumer НЕ МОЖЕТ обновлять товары (403).
    """
    # Проверяем существование продукта
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Проверка прав
    if current_user.role == "consumer":
        # Потребитель не вправе изменять товары
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if current_user.role == "farmer" and product.owner_id != current_user.id:
        # Фермер может редактировать только свои товары
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify product you don't own")

    # Применяем изменения из payload (только поля, которые пришли)
    changed = False
    for field, value in payload.dict(exclude_unset=True).items():
        # Дополнительная защита: не позволяем поменять owner_id через этот эндпоинт
        if field == "owner_id":
            continue
        setattr(product, field, value)
        changed = True

    if changed:
        try:
            db.commit()
            db.refresh(product)
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to update product %s: %s", product_id, exc)
            raise HTTPException(status_code=500, detail="Database error on update")
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int,
                   current_user: UserModel = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """
    Удаление продукта: мягкое удаление (is_active=False).
    Физическое удаление можно реализовать отдельно с удалением медиа из MinIO.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _require_owner_or_admin(current_user, product)
    product.is_active = False
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to soft-delete product %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete")
    return {}

# -------------------- Passport endpoints -------------------------------------
@router.get("/{product_id}/passport", response_model=ProductPassportOut)
def get_passport(product_id: int, db: Session = Depends(get_db)):
    """
    Получить паспорт товара (публично). Если паспорта нет — 404.
    """
    passport = db.query(ProductPassport).filter(ProductPassport.product_id == product_id).first()
    if not passport:
        raise HTTPException(status_code=404, detail="Passport not found")
    return passport
@router.put("/{product_id}/passport", response_model=ProductPassportOut)
def upsert_passport(
    product_id: int,
    payload: ProductPassportCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Создать/обновить паспорт товара.
    - Только аутентифицированные пользователи.
    - admin может изменять паспорт любого товара.
    - farmer может изменять паспорт только для своих товаров.
    - consumer НЕ МОЖЕТ изменять паспорт (403).
    """
    # Проверяем продукт
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Проверка прав
    if current_user.role == "consumer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if current_user.role == "farmer" and product.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify passport for product you don't own")

    # Получаем или создаём паспорт
    passport = db.query(ProductPassport).filter(ProductPassport.product_id == product_id).first()
    if not passport:
        passport = ProductPassport(product_id=product_id)

    # Применяем строго заданные поля (не заливаем произвольный JSON без валидации)
    passport.origin = payload.origin
    passport.variety = payload.variety
    passport.harvest_date = payload.harvest_date
    # Сохраняем список сертификатов и структурированные данные
    passport.certifications = payload.certifications or []
    passport.data = payload.data or {}

    try:
        db.add(passport)
        db.commit()
        db.refresh(passport)
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Integrity error when upserting passport %s: %s", product_id, exc)
        raise HTTPException(status_code=400, detail="Invalid passport data")
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to upsert passport %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail="Database error")

    return passport


# -------------------- Media (presign / confirm / delete) ----------------------
@router.post("/{product_id}/media/presign", status_code=200)
def presign_media_upload(product_id: int, payload: ProductMediaIn,
                         current_user: UserModel = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """
    Получить presigned URL для загрузки файла напрямую в MinIO.
    Возвращает object_key и upload_url (PUT). Только farmer-owner и admin.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _require_owner_or_admin(current_user, product)

    # Формируем безопасный объектный ключ: products/{product_id}/{uuid}.{ext}
    filename = payload.filename
    ext = filename.split(".")[-1] if "." in filename else "jpg"
    object_key = f"products/{product_id}/{uuid.uuid4().hex}.{ext}"
    try:
        upload_url = presigned_put_object(object_key, expires_minutes=10)
    except Exception as exc:
        logger.exception("Failed to create presigned put for %s: %s", object_key, exc)
        raise HTTPException(status_code=500, detail="Failed to create upload url")
    return {"object_key": object_key, "upload_url": upload_url}

@router.post("/{product_id}/media/confirm", status_code=201, response_model=ProductMediaOut)
def confirm_media(product_id: int, payload: ProductMediaConfirm,
                  current_user: UserModel = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """
    Подтверждение успешной загрузки файла клиентом.
    Создаёт запись ProductMedia.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _require_owner_or_admin(current_user, product)

    media = ProductMedia(
        product_id=product_id,
        object_key=payload.object_key,
        mime_type=payload.mime_type,
        is_primary=payload.is_primary,
        meta=payload.meta
    )
    db.add(media)
    try:
        db.commit()
        db.refresh(media)
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Integrity error on confirming media for product %s: %s", product_id, exc)
        raise HTTPException(status_code=400, detail="Invalid media data or duplicate")
    except Exception as exc:
        db.rollback()
        logger.exception("DB error on confirming media for product %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail="Database error")

    # Если помечено как primary — убрать primary с других медиа этого продукта
    if media.is_primary:
        try:
            db.query(ProductMedia).filter(ProductMedia.product_id == product_id, ProductMedia.id != media.id).update({"is_primary": False})
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to unset other primary media for product %s", product_id)

    # добавляем presigned GET для выдачи клиенту
    try:
        media.presigned_url = presigned_get_object(media.object_key, expires_minutes=60)
    except Exception:
        media.presigned_url = None

    return media

@router.delete("/{product_id}/media/{media_id}", status_code=204)
def delete_media(product_id: int, media_id: int,
                 current_user: UserModel = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """
    Удаляет запись media и пытается удалить объект из MinIO.
    (Если удаление из MinIO не удалось — логируем, но всё равно удаляем запись).
    """
    media = db.query(ProductMedia).filter(ProductMedia.id == media_id, ProductMedia.product_id == product_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    product = db.query(Product).filter(Product.id == product_id).first()
    _require_owner_or_admin(current_user, product)

    # сначала удаляем объект в MinIO
    try:
        ok = remove_object(media.object_key)
        if not ok:
            logger.warning("remove_object returned False for %s", media.object_key)
    except Exception:
        logger.exception("Failed to remove object %s from MinIO", media.object_key)
    # затем удаляем запись в БД
    try:
        db.delete(media)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete media record %s: %s", media_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete media")
    return {}
