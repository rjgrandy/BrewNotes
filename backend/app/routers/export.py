import csv
import io
import json
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_db
from ..models import Bean, DrinkLog

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export.json")
def export_json(db: Session = Depends(get_db)) -> Response:
    beans = [bean_to_dict(bean) for bean in db.scalars(select(Bean)).all()]
    drinks = [drink_to_dict(drink) for drink in db.scalars(select(DrinkLog)).all()]
    payload = {"beans": beans, "drinks": drinks}
    return Response(content=json.dumps(payload, default=str), media_type="application/json")


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)) -> Response:
    beans = [bean_to_dict(bean) for bean in db.scalars(select(Bean)).all()]
    drinks = [drink_to_dict(drink) for drink in db.scalars(select(DrinkLog)).all()]
    beans_csv = dicts_to_csv(beans)
    drinks_csv = dicts_to_csv(drinks)
    combined = f"# beans.csv\n{beans_csv}\n# drinks.csv\n{drinks_csv}"
    return Response(content=combined, media_type="text/plain")


@router.get("/export.zip")
def export_zip(db: Session = Depends(get_db)) -> FileResponse:
    beans = [bean_to_dict(bean) for bean in db.scalars(select(Bean)).all()]
    drinks = [drink_to_dict(drink) for drink in db.scalars(select(DrinkLog)).all()]
    export_path = settings.data_dir / "export.zip"
    with zipfile.ZipFile(export_path, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("export.json", json.dumps({"beans": beans, "drinks": drinks}, default=str))
        zip_file.writestr("beans.csv", dicts_to_csv(beans))
        zip_file.writestr("drinks.csv", dicts_to_csv(drinks))
        uploads_dir = settings.upload_dir
        if uploads_dir.exists():
            for path in uploads_dir.rglob("*"):
                if path.is_file():
                    zip_file.write(path, Path("uploads") / path.relative_to(uploads_dir))
    return FileResponse(export_path, filename="export.zip")


def dicts_to_csv(rows: list[dict]) -> str:
    if not rows:
        return ""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def bean_to_dict(bean: Bean) -> dict:
    return {
        "id": bean.id,
        "name": bean.name,
        "roaster": bean.roaster,
        "origin": bean.origin,
        "process": bean.process,
        "roast_level": bean.roast_level,
        "tasting_notes": bean.tasting_notes,
        "roast_date": bean.roast_date,
        "open_date": bean.open_date,
        "bag_size_g": bean.bag_size_g,
        "price": bean.price,
        "decaf": bean.decaf,
        "notes": bean.notes,
        "image_path": bean.image_path,
        "thumbnail_path": bean.thumbnail_path,
        "archived": bean.archived,
        "current_best_settings": bean.current_best_settings,
        "created_at": bean.created_at,
        "updated_at": bean.updated_at,
    }


def drink_to_dict(drink: DrinkLog) -> dict:
    return {
        "id": drink.id,
        "created_at": drink.created_at,
        "bean_id": drink.bean_id,
        "drink_type": drink.drink_type,
        "custom_label": drink.custom_label,
        "made_by": drink.made_by,
        "rated_by": drink.rated_by,
        "temperature_level": drink.temperature_level,
        "body_level": drink.body_level,
        "order": drink.order,
        "coffee_volume_ml": drink.coffee_volume_ml,
        "milk_volume_ml": drink.milk_volume_ml,
        "strength_level": drink.strength_level,
        "grind_setting": drink.grind_setting,
        "overall_rating": drink.overall_rating,
        "sweetness": drink.sweetness,
        "bitterness": drink.bitterness,
        "acidity": drink.acidity,
        "body_mouthfeel": drink.body_mouthfeel,
        "balance": drink.balance,
        "would_make_again": drink.would_make_again,
        "dialed_in": drink.dialed_in,
        "notes": drink.notes,
        "photo_path": drink.photo_path,
        "thumbnail_path": drink.thumbnail_path,
    }
