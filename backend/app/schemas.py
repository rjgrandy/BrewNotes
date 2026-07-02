from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .utils import to_web_path


class BeanBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    roaster: str | None = None
    origin: str | None = None
    process: str | None = None
    roast_level: str | None = None
    tasting_notes: str | None = None
    roast_date: date | None = None
    open_date: date | None = None
    bag_size_g: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, ge=0)
    decaf: bool = False
    notes: str | None = None
    archived: bool = False
    current_best_settings: dict | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class BeanCreate(BeanBase):
    pass


class BeanUpdate(BeanBase):
    pass


class BeanOut(BeanBase):
    id: str
    image_path: str | None = None
    thumbnail_path: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("image_path", "thumbnail_path")
    @classmethod
    def normalize_paths(cls, value: str | None) -> str | None:
        return to_web_path(value)

    class Config:
        from_attributes = True


class DrinkLogBase(BaseModel):
    bean_id: str
    drink_type: str = Field(min_length=1, max_length=100)
    custom_label: str | None = None
    made_by: str | None = None
    rated_by: str | None = None
    temperature_level: str
    body_level: str
    order: str
    coffee_volume_ml: float = Field(ge=0, le=1000)
    milk_volume_ml: float = Field(ge=0, le=1000)
    strength_level: str
    grind_setting: int = Field(ge=1, le=7)
    overall_rating: int = Field(ge=1, le=5)
    sweetness: int = Field(ge=1, le=5)
    bitterness: int = Field(ge=1, le=5)
    acidity: int = Field(ge=1, le=5)
    body_mouthfeel: int = Field(ge=1, le=5)
    balance: int = Field(ge=1, le=5)
    would_make_again: bool = False
    dialed_in: bool = False
    notes: str | None = None


class DrinkLogCreate(DrinkLogBase):
    pass


class DrinkLogUpdate(DrinkLogBase):
    pass


class DrinkLogOut(DrinkLogBase):
    id: str
    created_at: datetime
    photo_path: str | None = None
    thumbnail_path: str | None = None

    @field_validator("photo_path", "thumbnail_path")
    @classmethod
    def normalize_paths(cls, value: str | None) -> str | None:
        return to_web_path(value)

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
