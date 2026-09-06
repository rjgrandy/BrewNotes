from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


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
    rating: int | None = None
    notes: str | None = None
    archived: bool = False
    current_best_settings: dict | None = None


class BeanCreate(BeanBase):
    name: str = Field(min_length=1, max_length=200)
    bag_size_g: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    rating: int | None = Field(default=None, ge=1, le=5)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class BeanUpdate(BeanCreate):
    image_path: str | None = None
    thumbnail_path: str | None = None


class RecipeSettings(BaseModel):
    temperature_level: str | None = None
    body_level: str | None = None
    order: str | None = None
    coffee_volume_ml: float | None = None
    milk_volume_ml: float | None = None
    strength_level: str | None = None
    grind_setting: int | None = None


class BeanRecipeIn(BaseModel):
    settings: RecipeSettings
    source: str = "manual"
    source_drink_id: str | None = None


class BeanRecipeOut(BaseModel):
    id: str
    bean_id: str
    drink_type: str
    settings: dict = {}
    source: str
    source_drink_id: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("settings", mode="before")
    @classmethod
    def _settings_never_null(cls, value: object) -> object:
        # Legacy/backfilled rows may have a null settings blob; treat as empty.
        return value or {}

    class Config:
        from_attributes = True


class BeanPhotoOut(BaseModel):
    id: str
    bean_id: str
    image_path: str
    thumbnail_path: str
    caption: str | None = None
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class BeanOut(BeanBase):
    id: str
    image_path: str | None = None
    thumbnail_path: str | None = None
    created_at: datetime
    updated_at: datetime
    recipes: list[BeanRecipeOut] = []
    photos: list[BeanPhotoOut] = []

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
    coffee_volume_ml: float = Field(ge=0, allow_inf_nan=False)
    milk_volume_ml: float = Field(ge=0, allow_inf_nan=False)
    grind_setting: int = Field(ge=1, le=7)
    overall_rating: int = Field(ge=1, le=5)
    sweetness: int = Field(ge=1, le=5)
    bitterness: int = Field(ge=1, le=5)
    acidity: int = Field(ge=1, le=5)
    body_mouthfeel: int = Field(ge=1, le=5)
    balance: int = Field(ge=1, le=5)


class DrinkLogUpdate(DrinkLogCreate):
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
