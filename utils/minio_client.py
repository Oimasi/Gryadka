# -*- coding: utf-8 -*-
"""
Минимальный и безопасный helper для работы с MinIO (presigned URL).
Используется minio-py: pip install minio
"""

import os
import logging
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger("minio_client")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_SECURE = os.getenv("MINIO_SECURE", "0") == "1"
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "products")

if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
    raise RuntimeError("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in environment")

# MinIO client (strip protocol for host param)
minio_client = Minio(
    MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

def ensure_bucket_exists():
    """
    Создать бакет, если не существует. Безопасная операция (игнорирует ошибку существования).
    """
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
    except S3Error as exc:
        logger.exception("MinIO bucket create/check error: %s", exc)
        raise

def presigned_put_object(object_name: str, expires_minutes: int = 10):
    """
    Возвращает presigned PUT URL для загрузки объекта напрямую в MinIO.
    Срок действия короткий по умолчанию.
    """
    try:
        internal_url = minio_client.presigned_put_object(MINIO_BUCKET, object_name, expires=timedelta(minutes=expires_minutes))
        # Заменяем внутренний адрес MinIO на публичный через Nginx
        public_url = internal_url.replace('http://localhost:9000', 'https://gryadka.tech/minio').replace('http://127.0.0.1:9000', 'https://gryadka.tech/minio')
        return public_url
    except S3Error as exc:
        logger.exception("presigned_put_object failed: %s", exc)
        raise

def presigned_get_object(object_name: str, expires_minutes: int = 60):
    """
    Возвращает presigned GET URL для безопасного просмотра объекта.
    """
    try:
        internal_url = minio_client.presigned_get_object(MINIO_BUCKET, object_name, expires=timedelta(minutes=expires_minutes))
        # Заменяем внутренний адрес MinIO на публичный через Nginx
        public_url = internal_url.replace('http://localhost:9000', 'https://gryadka.tech/minio').replace('http://127.0.0.1:9000', 'https://gryadka.tech/minio')
        return public_url
    except S3Error as exc:
        logger.exception("presigned_get_object failed: %s", exc)
        raise
def remove_object(object_name: str):
    """
    Удаление объекта из бакета. Возвращает True/False.
    """
    try:
        minio_client.remove_object(MINIO_BUCKET, object_name)
        return True
    except S3Error as exc:
        logger.exception("remove_object failed: %s", exc)
        return False
