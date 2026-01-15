from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_db
from ..models import DrinkLog
from ..schemas import DrinkLogCreate, DrinkLogOut, DrinkLogUpdate
from ..utils import save_upload

router = APIRouter(prefix="/api/drinks", tags=["drinks"])


@router.get("", response_model=list[DrinkLogOut])
def list_drinks(db: Session = Depends(get_db)) -> list[DrinkLog]:
    return db.scalars(select(DrinkLog).order_by(DrinkLog.created_at.desc())).all()


@router.post("", response_model=DrinkLogOut)
def create_drink(payload: DrinkLogCreate, db: Session = Depends(get_db)) -> DrinkLog:
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
    db.delete(drink)
    db.commit()
    return {"status": "deleted"}


@router.post("/{drink_id}/photo", response_model=DrinkLogOut)
def upload_drink_photo(drink_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> DrinkLog:
    drink = db.get(DrinkLog, drink_id)
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    upload_dir = settings.upload_dir / "drinks"
    thumb_dir = upload_dir / "thumbs"
    image_path, thumbnail_path = save_upload(file, upload_dir, thumb_dir)
    drink.photo_path = image_path
    drink.thumbnail_path = thumbnail_path
    db.commit()
    db.refresh(drink)
    return drink
