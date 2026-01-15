from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_db
from ..models import Bean, DrinkLog
from ..schemas import BeanAnalytics, BeanCreate, BeanOut, BeanUpdate, RecommendedSettings
from ..utils import save_upload

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
def recommended_settings(bean_id: str, db: Session = Depends(get_db)) -> RecommendedSettings:
    drinks = db.scalars(select(DrinkLog).where(DrinkLog.bean_id == bean_id)).all()
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
