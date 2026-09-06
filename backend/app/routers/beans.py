from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_db
from ..models import Bean, BeanPhoto, BeanRecipe, DrinkLog
from ..schemas import (
    BeanAnalytics,
    BeanCreate,
    BeanOut,
    BeanPhotoOut,
    BeanRecipeIn,
    BeanRecipeOut,
    BeanUpdate,
    RecommendedSettings,
)
from ..utils import save_upload, remove_upload

router = APIRouter(prefix="/api/beans", tags=["beans"])


@router.get("", response_model=list[BeanOut])
def list_beans(include_archived: bool = False, db: Session = Depends(get_db)) -> list[Bean]:
    query = select(Bean)
    if not include_archived:
        query = query.where(Bean.archived.is_(False))
    return db.scalars(query.order_by(Bean.name)).all()


@router.post("", response_model=BeanOut)
def create_bean(payload: BeanCreate, db: Session = Depends(get_db)) -> Bean:
    bean = Bean(**payload.model_dump())
    db.add(bean)
    db.commit()
    db.refresh(bean)
    return bean


@router.get("/{bean_id}", response_model=BeanOut)
def get_bean(bean_id: str, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    return bean


@router.put("/{bean_id}", response_model=BeanOut)
def update_bean(bean_id: str, payload: BeanUpdate, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(bean, key, value)
    bean.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bean)
    return bean


@router.post("/{bean_id}/archive", response_model=BeanOut)
def archive_bean(bean_id: str, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    bean.archived = True
    db.commit()
    db.refresh(bean)
    return bean


@router.post("/{bean_id}/unarchive", response_model=BeanOut)
def unarchive_bean(bean_id: str, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    bean.archived = False
    db.commit()
    db.refresh(bean)
    return bean


@router.post("/{bean_id}/photo", response_model=BeanOut)
def upload_bean_photo(bean_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    upload_dir = settings.upload_dir / "beans"
    thumb_dir = upload_dir / "thumbs"
    image_path, thumbnail_path = save_upload(file, upload_dir, thumb_dir)
    bean.image_path = image_path
    bean.thumbnail_path = thumbnail_path
    db.commit()
    db.refresh(bean)
    return bean


# ---- Per bean x drink-type recipes ----


@router.get("/{bean_id}/recipes", response_model=list[BeanRecipeOut])
def list_recipes(bean_id: str, db: Session = Depends(get_db)) -> list[BeanRecipe]:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    return bean.recipes


@router.put("/{bean_id}/recipes/{drink_type}", response_model=BeanRecipeOut)
def upsert_recipe(
    bean_id: str, drink_type: str, payload: BeanRecipeIn, db: Session = Depends(get_db)
) -> BeanRecipe:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    recipe = db.scalar(
        select(BeanRecipe).where(BeanRecipe.bean_id == bean_id, BeanRecipe.drink_type == drink_type)
    )
    clean_settings = payload.settings.model_dump(exclude_none=True)
    if recipe:
        recipe.settings = clean_settings
        recipe.source = payload.source
        recipe.source_drink_id = payload.source_drink_id
        recipe.updated_at = datetime.utcnow()
    else:
        recipe = BeanRecipe(
            bean_id=bean_id,
            drink_type=drink_type,
            settings=clean_settings,
            source=payload.source,
            source_drink_id=payload.source_drink_id,
        )
        db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/{bean_id}/recipes/{drink_type}")
def delete_recipe(bean_id: str, drink_type: str, db: Session = Depends(get_db)) -> dict:
    recipe = db.scalar(
        select(BeanRecipe).where(BeanRecipe.bean_id == bean_id, BeanRecipe.drink_type == drink_type)
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"status": "deleted"}


# ---- Multiple reference photos per bean ----


def _safe_unlink(path: str | None) -> None:
    remove_upload(path, settings.upload_dir)


@router.post("/{bean_id}/photos", response_model=BeanOut)
def add_bean_photo(bean_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    upload_dir = settings.upload_dir / "beans"
    thumb_dir = upload_dir / "thumbs"
    image_path, thumbnail_path = save_upload(file, upload_dir, thumb_dir)
    next_order = max((photo.sort_order for photo in bean.photos), default=-1) + 1
    photo = BeanPhoto(
        bean_id=bean_id,
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        sort_order=next_order,
    )
    db.add(photo)
    if not bean.image_path:
        bean.image_path = image_path
        bean.thumbnail_path = thumbnail_path
    db.commit()
    db.refresh(bean)
    return bean


@router.delete("/{bean_id}/photos/{photo_id}", response_model=BeanOut)
def delete_bean_photo(bean_id: str, photo_id: str, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    photo = db.get(BeanPhoto, photo_id)
    if not photo or photo.bean_id != bean_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    was_cover = bean.image_path == photo.image_path
    _safe_unlink(photo.image_path)
    _safe_unlink(photo.thumbnail_path)
    db.delete(photo)
    db.flush()
    db.refresh(bean)
    if was_cover:
        remaining = bean.photos
        if remaining:
            bean.image_path = remaining[0].image_path
            bean.thumbnail_path = remaining[0].thumbnail_path
        else:
            bean.image_path = None
            bean.thumbnail_path = None
    db.commit()
    db.refresh(bean)
    return bean


@router.post("/{bean_id}/photos/{photo_id}/image", response_model=BeanOut)
def replace_bean_photo(bean_id: str, photo_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    photo = db.get(BeanPhoto, photo_id)
    if not bean or not photo or photo.bean_id != bean_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    old_image, old_thumb = photo.image_path, photo.thumbnail_path
    upload_dir = settings.upload_dir / "beans"
    image_path, thumbnail_path = save_upload(file, upload_dir, upload_dir / "thumbs")
    photo.image_path, photo.thumbnail_path = image_path, thumbnail_path
    if bean.image_path == old_image:
        bean.image_path, bean.thumbnail_path = image_path, thumbnail_path
    bean.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bean)
    _safe_unlink(old_image)
    _safe_unlink(old_thumb)
    return bean


@router.post("/{bean_id}/photos/{photo_id}/cover", response_model=BeanOut)
def set_bean_cover(bean_id: str, photo_id: str, db: Session = Depends(get_db)) -> Bean:
    bean = db.get(Bean, bean_id)
    if not bean:
        raise HTTPException(status_code=404, detail="Bean not found")
    photo = db.get(BeanPhoto, photo_id)
    if not photo or photo.bean_id != bean_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    bean.image_path = photo.image_path
    bean.thumbnail_path = photo.thumbnail_path
    db.commit()
    db.refresh(bean)
    return bean


@router.get("/{bean_id}/analytics", response_model=BeanAnalytics)
def bean_analytics(bean_id: str, db: Session = Depends(get_db)) -> BeanAnalytics:
    drinks = db.scalars(select(DrinkLog).where(DrinkLog.bean_id == bean_id)).all()
    rating_vs_grind = [{"x": drink.grind_setting, "y": drink.overall_rating} for drink in drinks]
    rating_vs_coffee = [{"x": drink.coffee_volume_ml, "y": drink.overall_rating} for drink in drinks]

    temp_agg = (
        db.query(DrinkLog.temperature_level, func.avg(DrinkLog.overall_rating))
        .filter(DrinkLog.bean_id == bean_id)
        .group_by(DrinkLog.temperature_level)
        .all()
    )
    rating_by_temperature = [
        {"temperature_level": temp, "average_rating": float(avg or 0)} for temp, avg in temp_agg
    ]

    timeline = (
        db.query(func.date(DrinkLog.created_at), func.avg(DrinkLog.overall_rating))
        .filter(DrinkLog.bean_id == bean_id)
        .group_by(func.date(DrinkLog.created_at))
        .order_by(func.date(DrinkLog.created_at))
        .all()
    )
    rating_timeline = [
        {"date": str(date), "average_rating": float(avg or 0)} for date, avg in timeline
    ]

    categories = ["sweetness", "bitterness", "acidity", "body_mouthfeel", "balance"]
    radar = []
    if drinks:
        for category in categories:
            avg_value = sum(getattr(drink, category) for drink in drinks) / len(drinks)
            top_rated = [drink for drink in drinks if drink.overall_rating >= 4]
            top_avg = (
                sum(getattr(drink, category) for drink in top_rated) / len(top_rated)
                if top_rated
                else None
            )
            radar.append(
                {
                    "category": category.replace("_", " ").title(),
                    "average": avg_value,
                    "top_rated_average": top_avg,
                }
            )
    return BeanAnalytics(
        rating_vs_grind=rating_vs_grind,
        rating_vs_coffee_volume=rating_vs_coffee,
        rating_by_temperature=rating_by_temperature,
        rating_timeline=rating_timeline,
        radar=radar,
    )


@router.get("/{bean_id}/recommended-settings", response_model=RecommendedSettings)
def recommended_settings(
    bean_id: str, drink_type: str | None = None, db: Session = Depends(get_db)
) -> RecommendedSettings:
    query = select(DrinkLog).where(DrinkLog.bean_id == bean_id)
    if drink_type:
        query = query.where(DrinkLog.drink_type == drink_type)
    drinks = db.scalars(query).all()
    considered = [drink for drink in drinks if drink.overall_rating >= 4]
    if not considered:
        return RecommendedSettings(recommended=None, highest_rated=None, total_considered=0)

    def settings_tuple(drink: DrinkLog) -> tuple[Any, ...]:
        return (
            drink.temperature_level,
            drink.body_level,
            drink.order,
            drink.coffee_volume_ml,
            drink.milk_volume_ml,
            drink.strength_level,
            drink.grind_setting,
        )

    tuples: dict[tuple[Any, ...], list[DrinkLog]] = {}
    for drink in considered:
        tuples.setdefault(settings_tuple(drink), []).append(drink)

    def avg_rating(drinks_list: list[DrinkLog]) -> float:
        return sum(d.overall_rating for d in drinks_list) / len(drinks_list)

    most_common = max(
        tuples.items(),
        key=lambda item: (len(item[1]), avg_rating(item[1])),
    )
    highest_rated = max(considered, key=lambda d: d.overall_rating)

    recommended_dict = _settings_dict_from_drink(most_common[1][0])
    highest_dict = _settings_dict_from_drink(highest_rated)

    return RecommendedSettings(
        recommended=recommended_dict,
        highest_rated=highest_dict,
        total_considered=len(considered),
    )


def _settings_dict_from_drink(drink: DrinkLog) -> dict[str, Any]:
    return {
        "temperature_level": drink.temperature_level,
        "body_level": drink.body_level,
        "order": drink.order,
        "coffee_volume_ml": drink.coffee_volume_ml,
        "milk_volume_ml": drink.milk_volume_ml,
        "strength_level": drink.strength_level,
        "grind_setting": drink.grind_setting,
    }
