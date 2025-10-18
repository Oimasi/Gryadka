# routers/farms.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy.exc import IntegrityError
import logging

from database.database import get_db
from models import farm as farm_model, user as user_model
from schemas import farm as farm_schema, user as user_schema
from utils.auth import get_current_user

logger = logging.getLogger("farms_router")

router = APIRouter(prefix="/api/farms", tags=["farms"])

@router.get("", response_model=List[farm_schema.Farm])
def list_farms(db: Session = Depends(get_db)):
    """
    Возвращает список ферм (публично).
    """
    farms = db.query(farm_model.Farm).order_by(farm_model.Farm.created_at.desc()).all()
    return farms

@router.post("", response_model=farm_schema.Farm, status_code=201)
def create_farm(farm_data: farm_schema.FarmCreate,
                current_user: user_model.User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """
    Создание новой фермы.

    Права доступа:
    - Только пользователи с ролью 'farmer' или 'admin' могут создавать фермы.
    - Пользователь 'farmer' может создавать фермы только для себя (owner_id должен совпадать с current_user.id).
    - Пользователь 'admin' может создавать фермы для любого пользователя.

    Args:
        farm_data (farm_schema.FarmCreate): Данные новой фермы (name, description, owner_id).
        current_user (user_model.User): Текущий аутентифицированный пользователь.
        db (Session): Сессия базы данных SQLAlchemy.

    Returns:
        farm_model.Farm: Объект созданной фермы.

    Raises:
        HTTPException: Если у текущего пользователя недостаточно прав или если происходит ошибка базы данных.
    """
    if current_user.role not in ("farmer", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if farm_data.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create farm for another user")

    db_farm = farm_model.Farm(
        name=farm_data.name,
        description=farm_data.description,
        owner_id=farm_data.owner_id,
    )
    db.add(db_farm)
    try:
        db.commit()
        db.refresh(db_farm)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database integrity error")
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected DB error creating farm: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return db_farm
