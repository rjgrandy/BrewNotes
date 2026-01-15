from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class BeanBase(BaseModel):
    name: str
    roaster: str | None = None
    origin: str | None = None
    process: str | None = None
    roast_level: str | None = None
    tasting_notes: str | None = None
    roast_date: date | None = None
    open_date: date | None = None
    bag_size_g: int | None = None
    price: float | None = None
    decaf: bool = False
    notes: str | None = None
    archived: bool = False
    current_best_settings: dict | None = None


class BeanCreate(BeanBase):
    pass


class BeanUpdate(BeanBase):
    image_path: str | None = None
    thumbnail_path: str | None = None


class BeanOut(BeanBase):
    id: str
    image_path: str | None = None
    thumbnail_path: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DrinkLogBase(BaseModel):
    bean_id: str
    drink_type: str
    custom_label: str | None = None
    made_by: str | None = None
    rated_by: str | None = None
    temperature_level: str
    body_level: str
    order: str
    coffee_volume_ml: float
    milk_volume_ml: float
    strength_level: str
    grind_setting: int
    overall_rating: int
    sweetness: int
    bitterness: int
    acidity: int
    body_mouthfeel: int
    balance: int
    would_make_again: bool = False
    dialed_in: bool = False
    notes: str | None = None


class DrinkLogCreate(DrinkLogBase):
    pass


class DrinkLogUpdate(DrinkLogBase):
    photo_path: str | None = None
    thumbnail_path: str | None = None


class DrinkLogOut(DrinkLogBase):
    id: str
    created_at: datetime
    photo_path: str | None = None
    thumbnail_path: str | None = None

    class Config:
        from_attributes = True


class AnalyticsPoint(BaseModel):
    x: float
    y: float


class RatingByTemp(BaseModel):
    temperature_level: str
    average_rating: float


class TimelinePoint(BaseModel):
    date: str
    average_rating: float


class RadarEntry(BaseModel):
    category: str
    average: float
    top_rated_average: float | None = None


class BeanAnalytics(BaseModel):
    rating_vs_grind: list[AnalyticsPoint]
    rating_vs_coffee_volume: list[AnalyticsPoint]
    rating_by_temperature: list[RatingByTemp]
    rating_timeline: list[TimelinePoint]
    radar: list[RadarEntry]


class RecommendedSettings(BaseModel):
    recommended: dict | None = None
    highest_rated: dict | None = None
    total_considered: int = 0


class ExportResponse(BaseModel):
    beans: list[dict[str, Any]]
    drinks: list[dict[str, Any]]
