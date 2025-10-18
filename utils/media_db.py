# /farm_backend/utils/media_db.py
# -*- coding: utf-8 -*-
"""
Media DB abstraction over Postgres.
Заменяет MinIO flow: presign -> staged_uploads -> upload -> confirm -> product_media.

"""

from typing import Optional, Dict, Any
from uuid import uuid4
from pathlib import Path
from datetime import datetime
import logging

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, NoResultFound


from models.product import StagedUpload, ProductMedia
from database.database import SessionLocal

logger = logging.getLogger("media_db")


def gen_object_key(product_id: int, filename: str) -> str:
    """
    Генерирует уникальный object_key для staged upload.
    Формат: products/{product_id}/{uuid}{suffix}
    """
    suffix = Path(filename).suffix or ""
    return f"products/{product_id}/{uuid4().hex}{suffix}"


def create_staged_placeholder(db: Session, object_key: str, product_id: int, filename: str, mime_type: str = "application/octet-stream") -> StagedUpload:
    """
    Создаёт placeholder в staged_uploads с пустым content (bytea).
    Полезно для сценария presign -> confirm без фактического upload.
    Возвращает объект StagedUpload (обновлённый из БД).
    """
    # Попробуем вставить новую запись; если уже есть — вернём существующую.
    existing = db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()
    if existing:
        return existing

    staged = StagedUpload(
        object_key=object_key,
        product_id=product_id,
        filename=filename,
        content=b"",  # placeholder
        mime_type=mime_type,
        created_at=datetime.utcnow()
    )
    db.add(staged)
    try:
        db.commit()
        db.refresh(staged)
        return staged
    except IntegrityError:
        db.rollback()
        # кто-то уже вставил — безопасно вернём её
        staged = db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()
        if staged:
            return staged
        raise


def store_staged_upload(db: Session, object_key: str, product_id: int, filename: str, content: bytes, mime_type: str = "application/octet-stream") -> StagedUpload:
    """
    Сохраняет/обновляет staged_upload запись с реальным содержимым.
    Возвращает StagedUpload.
    """
    
    staged = db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()
    if staged is None:
        staged = StagedUpload(
            object_key=object_key,
            product_id=product_id,
            filename=filename,
            content=content or b"",
            mime_type=mime_type,
            created_at=datetime.utcnow()
        )
        db.add(staged)
    else:
        staged.filename = filename or staged.filename
        staged.content = content or staged.content
        staged.mime_type = mime_type or staged.mime_type
        staged.created_at = staged.created_at or datetime.utcnow()
    try:
        db.commit()
        db.refresh(staged)
        return staged
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to store staged upload %s: %s", object_key, exc)
        raise

def create_media_from_staged(db: Session, object_key: str, is_primary: bool = False, meta: Optional[Dict[str, Any]] = None, mime_type: Optional[str] = None) -> ProductMedia:
    """
    Создаёт запись ProductMedia из staged_upload по object_key.
    Безопасно приводит staged.content к bytes, создаёт запись ProductMedia,
    снимает is_primary у других медиа при необходимости и удаляет staged запись.
    Возвращает созданный ProductMedia объект.
    """
    staged = db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()
    if not staged:
        raise ValueError("staged upload not found")

    # Приводим staged.content к bytes безопасно
    raw = getattr(staged, "content", None) or b""
    try:
        if isinstance(raw, memoryview):
            content_bytes = raw.tobytes()
        elif isinstance(raw, bytearray):
            content_bytes = bytes(raw)
        elif isinstance(raw, str):
            content_bytes = raw.encode("utf-8")
        else:
            content_bytes = raw
    except Exception:
        logger.exception("Failed to coerce staged.content to bytes for object_key=%s", object_key)
        content_bytes = b""

    filename = getattr(staged, "filename", object_key) or object_key
    final_mime = mime_type or getattr(staged, "mime_type", "application/octet-stream")

    media = ProductMedia(
        product_id=staged.product_id,
        filename=filename,
        object_key=object_key,
        content=content_bytes or b"",
        mime_type=final_mime,
        width=getattr(staged, "width", None),
        height=getattr(staged, "height", None),
        is_primary=is_primary,
        meta=meta or {},
        created_at=datetime.utcnow()
    )

    db.add(media)
    try:
        db.commit()
        db.refresh(media)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to commit new media from staged %s: %s", object_key, exc)
        raise

    # Если нужно — снять флаг primary у других медиа того же продукта
    if media.is_primary:
        try:
            db.query(ProductMedia).filter(
                ProductMedia.product_id == media.product_id,
                ProductMedia.id != media.id
            ).update({"is_primary": False})
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to unset other primary media for product %s", media.product_id)

    # Удаляем staged запись (cleanup)
    try:
        db.query(StagedUpload).filter(StagedUpload.object_key == object_key).delete()
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to delete staged upload %s after creating media", object_key)

    return media



def public_media_url(media_id: int) -> str:
    """
    Возвращает относительный URL, по которому ваше приложение служит бинарник.
    В вашем проекте есть роутер: GET /api/products/media/{media_id}/file
    Возвращаем относительный путь — при необходимости замените на абсолютный с доменом.
    """
    return f"/api/products/media/{media_id}/file"


# ---- Вспомогательные функции ----
def get_staged_by_object_key(db: Session, object_key: str) -> Optional[StagedUpload]:
    """
    Получает staged upload по object_key.
    
    Args:
        db (Session): Сессия базы данных.
        object_key (str): Ключ объекта staged upload.
        
    Returns:
        Optional[StagedUpload]: Объект staged upload или None.
    """
    return db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()


def delete_media(db: Session, media_id: int) -> None:
    """
    Удаляет медиа по ID.
    
    Args:
        db (Session): Сессия базы данных.
        media_id (int): ID медиа для удаления.
    """
    db.query(ProductMedia).filter(ProductMedia.id == media_id).delete()
    db.commit()
