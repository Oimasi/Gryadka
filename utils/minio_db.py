import uuid
from urllib.parse import quote_plus
from sqlalchemy.orm import Session
from models.product import StagedUpload, ProductMedia


def gen_object_key(product_id: int, filename: str) -> str:
    """
    Генерирует уникальный ключ объекта для staged upload.
    
    Args:
        product_id (int): ID продукта.
        filename (str): Имя файла.
        
    Returns:
        str: Уникальный ключ объекта в формате products/{product_id}/{uuid}.{ext}.
    """
    ext = filename.split('.')[-1] if '.' in filename else 'bin'
    return f"products/{product_id}/{uuid.uuid4().hex}.{ext}"


def store_staged_upload(db: Session, object_key: str, product_id: int, filename: str, content: bytes, mime_type: str):
    """
    Сохраняет staged upload в базу данных.
    
    Args:
        db (Session): Сессия базы данных.
        object_key (str): Ключ объекта.
        product_id (int): ID продукта.
        filename (str): Имя файла.
        content (bytes): Содержимое файла.
        mime_type (str): MIME тип файла.
        
    Returns:
        StagedUpload: Объект сохраненного staged upload.
    """
    su = StagedUpload(object_key=object_key, product_id=product_id, filename=filename, content=content, mime_type=mime_type)
    db.add(su)
    db.commit()
    db.refresh(su)
    return su


def get_staged_upload(db: Session, object_key: str):
    """
    Получает staged upload по object_key.
    
    Args:
        db (Session): Сессия базы данных.
        object_key (str): Ключ объекта staged upload.
        
    Returns:
        StagedUpload: Объект staged upload или None.
    """
    return db.query(StagedUpload).filter(StagedUpload.object_key == object_key).first()


def remove_staged_upload(db: Session, object_key: str):
    """
    Удаляет staged upload по object_key.
    
    Args:
        db (Session): Сессия базы данных.
        object_key (str): Ключ объекта staged upload.
        
    Returns:
        bool: True если удаление прошло успешно, иначе False.
    """
    su = get_staged_upload(db, object_key)
    if not su:
        return False
    db.delete(su)
    db.commit()
    return True


def create_media_from_staged(db: Session, object_key: str, is_primary: bool, meta: dict, mime_type: str = None):
    """
    Создаёт ProductMedia из staged upload и удаляет staged запись.
    
    Args:
        db (Session): Сессия базы данных.
        object_key (str): Ключ объекта staged upload.
        is_primary (bool): Является ли медиа основным.
        meta (dict): Метаданные.
        mime_type (str, optional): MIME тип, если нужно переопределить.
        
    Returns:
        ProductMedia: Созданный объект ProductMedia.
        
    Raises:
        ValueError: Если staged upload не найден.
    """
    su = get_staged_upload(db, object_key)
    if not su:
        raise ValueError("staged upload not found")
    media = ProductMedia(product_id=su.product_id, filename=su.filename, content=su.content, mime_type=(mime_type or su.mime_type), is_primary=is_primary, meta=meta)
    db.add(media)
    db.commit()
    db.refresh(media)
    # cleanup staged
    try:
        db.delete(su)
        db.commit()
    except Exception:
        db.rollback()
    return media


def public_media_url(media_id: int) -> str:
    """
    Возвращает относительный URL для доступа к медиафайлу.
    
    Args:
        media_id (int): ID медиафайла.
        
    Returns:
        str: Относительный URL медиафайла.
    """
    # возвращаем внутренний публичный URL (без домена) — фронтэнд может подставить BASE_URL
    return f"/api/products/media/{media_id}/file"
