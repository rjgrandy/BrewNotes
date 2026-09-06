from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_db
from ..models import Bean, DrinkLog
from ..schemas import DrinkLogCreate, DrinkLogOut, DrinkLogUpdate
from ..utils import save_upload, remove_upload

router = APIRouter(prefix="/api/drinks", tags=["drinks"])


@router.get("", response_model=list[DrinkLogOut])
def list_drinks(bean_id: str | None = None, drink_type: str | None = None, db: Session = Depends(get_db)) -> list[DrinkLog]:
    query = select(DrinkLog)
    if bean_id:
        query = query.where(DrinkLog.bean_id == bean_id)
    if drink_type:
        query = query.where(DrinkLog.drink_type == drink_type)
    return db.scalars(query.order_by(DrinkLog.created_at.desc())).all()


@router.post("", response_model=DrinkLogOut)
def create_drink(payload: DrinkLogCreate, db: Session = Depends(get_db)) -> DrinkLog:
    if not db.get(Bean, payload.bean_id):
        raise HTTPException(status_code=422, detail="Choose an existing bean before saving your drink.")
    drink = DrinkLog(**payload.model_dump())
    db.add(drink)
    db.commit()
    db.refresh(drink)
    return drink


@router.get("/{drink_id}", response_model=DrinkLogOut)
def get_drink(drink_id: str, db: Session = Depends(get_db)) -> DrinkLog:
    drink = db.get(DrinkLog, drink_id)
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    return drink


@router.put("/{drink_id}", response_model=DrinkLogOut)
def update_drink(drink_id: str, payload: DrinkLogUpdate, db: Session = Depends(get_db)) -> DrinkLog:
    drink = db.get(DrinkLog, drink_id)
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    if not db.get(Bean, payload.bean_id):
        raise HTTPException(status_code=422, detail="Choose an existing bean before saving your drink.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(drink, key, value)
    db.commit()
    db.refresh(drink)
    return drink


@router.delete("/{drink_id}")
def delete_drink(drink_id: str, db: Session = Depends(get_db)) -> dict:
    drink = db.get(DrinkLog, drink_id)
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    image_path, thumbnail_path = drink.photo_path, drink.thumbnail_path
    db.delete(drink)
    db.commit()
    remove_upload(image_path, settings.upload_dir)
    remove_upload(thumbnail_path, settings.upload_dir)
    return {"status": "deleted"}


@router.post("/{drink_id}/photo", response_model=DrinkLogOut)
def upload_drink_photo(drink_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> DrinkLog:
    drink = db.get(DrinkLog, drink_id)
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    upload_dir = settings.upload_dir / "drinks"
    thumb_dir = upload_dir / "thumbs"
    old_image, old_thumb = drink.photo_path, drink.thumbnail_path
    image_path, thumbnail_path = save_upload(file, upload_dir, thumb_dir)
    drink.photo_path = image_path
    drink.thumbnail_path = thumbnail_path
    db.commit()
    db.refresh(drink)
    remove_upload(old_image, settings.upload_dir)
    remove_upload(old_thumb, settings.upload_dir)
    return drink
